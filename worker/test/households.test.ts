import { describe, expect, it } from 'vitest'

import { api, call, nextFriday } from './helpers'

describe('households', () => {
  it('creates a household of one with their own person on first request', async () => {
    const h = await api('hh-a', 'GET', '/household')
    expect(h.members).toHaveLength(1)
    expect(h.members[0]).toMatchObject({ userId: 'hh-a', role: 'owner', isYou: true })
    expect(h.persons).toHaveLength(1)
    expect(h.persons[0].userId).toBe('hh-a')
    expect(h.persons[0].name).toBe('User hh-a')
    expect(h.locationSet).toBe(false)
    const again = await api('hh-a', 'GET', '/household')
    expect(again.id).toBe(h.id)
  })

  it('sets the location and reports today in its time zone', async () => {
    const h = await api('hh-loc', 'PATCH', '/household', {
      location: { lat: 31.78, lng: 35.22, timeZone: 'Asia/Jerusalem', israel: true },
    })
    expect(h.locationSet).toBe(true)
    expect(h.location.israel).toBe(true)
    const bad = await call(
      'PATCH',
      '/api/household',
      { location: { lat: 1, lng: 1, timeZone: 'Nowhere/Land', israel: false } },
      'hh-loc',
    )
    expect(bad.status).toBe(400)
    expect(((await bad.json()) as any).error.code).toBe('invalid')
  })

  it('scopes everything to the household: user B cannot read user A’s data', async () => {
    const date = await nextFriday('scope-a')
    const recipe = await api(
      'scope-a',
      'POST',
      '/recipes/import',
      { servings: 4, title: 'Secret kugel', ingredients: ['2 eggs'], steps: ['Bake'] },
      201,
    )
    const meal = await api(
      'scope-a',
      'POST',
      '/meals',
      { date, name: 'A dinner', items: [{ versionId: recipe.version.id }] },
      201,
    )
    const person = (await api('scope-a', 'GET', '/people')).household.people[0]
    await api('scope-a', 'POST', '/pantry', { name: 'milk', expiresOn: '2099-01-01' }, 201)

    for (const [method, path] of [
      ['GET', `/meals/${meal.meal.id}`],
      ['GET', `/meals/${meal.meal.id}/brief`],
      ['GET', `/meals/${meal.meal.id}/suggestions`],
      ['GET', `/versions/${recipe.version.id}`],
      ['GET', `/recipes/${recipe.version.recipeId}`],
      ['GET', `/people/${person.id}`],
    ] as const) {
      const res = await call(method, `/api${path}`, undefined, 'scope-b')
      expect(res.status, path).toBe(404)
    }
    expect((await api('scope-b', 'GET', '/recipes')).total).toBe(0)
    expect((await api('scope-b', 'GET', '/pantry')).items).toHaveLength(0)
    const cal = await api('scope-b', 'GET', '/calendar?days=14')
    expect(cal.days.flatMap((d: any) => d.meals)).toHaveLength(0)
    // B cannot put A's recipe on B's meal, nor A's person in B's meal.
    const bm = await api('scope-b', 'POST', '/meals', { date, name: 'B dinner' }, 201)
    expect(
      (
        await call(
          'PATCH',
          `/api/meals/${bm.meal.id}`,
          { addItems: [{ versionId: recipe.version.id }] },
          'scope-b',
        )
      ).status,
    ).toBe(404)
    expect(
      (await call('PATCH', `/api/meals/${bm.meal.id}`, { addPersonIds: [person.id] }, 'scope-b'))
        .status,
    ).toBe(404)
    expect(
      (await call('PATCH', `/api/meals/${meal.meal.id}`, { name: 'hijacked' }, 'scope-b')).status,
    ).toBe(404)
  })

  it('invites a member, who brings their recipes; leaving takes their own recipes along', async () => {
    const aRecipe = await api(
      'inv-a',
      'POST',
      '/recipes/import',
      { servings: 4, title: 'A soup', ingredients: ['1 onion'], steps: ['Boil'] },
      201,
    )
    const bRecipe = await api(
      'inv-b',
      'POST',
      '/recipes/import',
      { servings: 4, title: 'B cake', ingredients: ['2 eggs'], steps: ['Bake'] },
      201,
    )
    const invite = await api('inv-a', 'POST', '/household/invites', {}, 201)
    expect(invite.url).toMatch(/\/join\//)
    const preview = await api('inv-b', 'GET', `/invites/${invite.token}`)
    expect(preview.householdName).toMatch(/inv-a/)
    const joined = await api('inv-b', 'POST', `/invites/${invite.token}/accept`, {})
    expect(joined.joined).toBe(true)
    // The invite is single use.
    expect((await call('POST', `/api/invites/${invite.token}/accept`, {}, 'inv-c')).status).toBe(
      404,
    )

    const h = await api('inv-a', 'GET', '/household')
    expect(h.members.map((m: any) => m.userId).sort()).toEqual(['inv-a', 'inv-b'])
    expect(h.persons).toHaveLength(2)
    const titles = (await api('inv-a', 'GET', '/recipes')).results.map((r: any) => r.title).sort()
    expect(titles).toEqual(['A soup', 'B cake'])
    // The member can edit the owner's recipe (the household has full access).
    await api('inv-b', 'PUT', `/versions/${aRecipe.version.id}`, { servings: 4 })

    // B cannot leave as owner; A cannot leave without handing over; B leaves with their own recipe only.
    expect((await call('POST', '/api/household/leave', {}, 'inv-a')).status).toBe(403)
    await api('inv-b', 'POST', '/household/leave', {})
    const after = await api('inv-b', 'GET', '/recipes')
    expect(after.results.map((r: any) => r.title)).toEqual(['B cake'])
    expect((await api('inv-a', 'GET', '/recipes')).results.map((r: any) => r.title)).toEqual([
      'A soup',
    ])
    expect(bRecipe.version.id).toBeTruthy()
  })
})

describe('adding a contact household in one call', () => {
  it('creates the household, its people and their constraints together', async () => {
    const h = await api(
      'hh-batch',
      'POST',
      '/contacts',
      {
        name: 'The Levins',
        people: [
          {
            name: 'Dana Levin',
            constraints: [{ tagType: 'diet', tag: 'vegetarian', severity: 'flexible' }],
            rules: ['no_fish_meat'],
          },
          {
            name: 'Noa',
            isChild: true,
            age: 6,
            constraints: [{ tagType: 'allergen', tag: 'sesame' }],
          },
        ],
      },
      201,
    )
    expect(h.name).toBe('The Levins')
    expect(h.people.map((p: any) => p.name)).toEqual(['Dana Levin', 'Noa'])
    const noa = h.people[1]
    expect(noa.isChild).toBe(true)
    expect(noa.constraints).toMatchObject([
      { tagType: 'allergen', tag: 'sesame', severity: 'strict', kind: 'medical', source: 'host' },
    ])
    expect(h.people[0].rules).toMatchObject([{ rule: 'no_fish_meat' }])

    const all = await api('hh-batch', 'GET', '/people')
    expect(all.contacts.find((c: any) => c.id === h.id).people).toHaveLength(2)
  })

  it('writes nothing when one person is invalid', async () => {
    const before = (await api('hh-batch2', 'GET', '/people')).contacts.length
    await api(
      'hh-batch2',
      'POST',
      '/contacts',
      {
        name: 'The Cohens',
        people: [
          { name: 'Avi' },
          { name: 'Tali', constraints: [{ tagType: 'diet', tag: 'carnivore' }] },
        ],
      },
      400,
    )
    expect((await api('hh-batch2', 'GET', '/people')).contacts).toHaveLength(before)
  })

  it('saves a new person with constraints in one call', async () => {
    const p = await api(
      'hh-batch3',
      'POST',
      '/people',
      { name: 'Guest', constraints: [{ tagType: 'allergen', tag: 'peanut' }] },
      201,
    )
    expect(p.constraints).toHaveLength(1)
  })
})
