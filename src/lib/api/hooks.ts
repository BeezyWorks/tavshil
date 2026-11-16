import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query'

import { api } from './client'
import type {
  AddDishInput,
  UpdateDishInput,
  HostedMeal,
  HostedPage,
  Household,
  Id,
  ISODate,
  MealPatch,
  NewMealInput,
  NewPerson,
  PickableHousehold,
  PrepDay,
  Recipe,
  RecipeFilters,
  VersionEdit,
} from './types'

export const useUpcoming = () =>
  useQuery({ queryKey: ['upcoming'], queryFn: () => api.getUpcoming() })

export const useCalendar = (from: ISODate, to: ISODate, enabled = true) =>
  useQuery({
    queryKey: ['calendar', from, to],
    queryFn: () => api.getCalendar({ from, to }),
    placeholderData: keepPreviousData,
    enabled,
  })

// ---- Plan tab: weeks, runs and hosted meals ----

/** A week of the Plan tab: any date in it (default today in the household's time zone). */
export const useWeek = (date?: ISODate) =>
  useQuery({
    queryKey: ['plan', 'week', date ?? 'today'],
    queryFn: () => api.getWeek(date),
    placeholderData: keepPreviousData,
  })

/** The month toggle: any range up to 62 days, in the same shape as a week. */
export const usePlan = (from: ISODate, to: ISODate, enabled = true) =>
  useQuery({
    queryKey: ['plan', 'range', from, to],
    queryFn: () => api.getPlan({ from, to }),
    placeholderData: keepPreviousData,
    enabled,
  })

/** The hosted page of a run (`run-…`) or a single hosted meal (`meal-…`); also what the print view reads. */
export const useHosted = (key: string) =>
  useQuery({ queryKey: ['hosted', key], queryFn: () => api.getHosted(key) })

/** One meal as a hosted-page row (the wizard uses it for its guests step). */
export const useHostedMeal = (mealId: Id | undefined, enabled = true) =>
  useQuery({
    queryKey: ['hostedMeal', mealId],
    queryFn: () => api.getHostedMeal(mealId!),
    enabled: !!mealId && enabled,
  })

/**
 * Recipes for a meal, split into those that pass every attendee's constraints and those that do not (with why).
 * Pass the debounced text. `gcTime: 0` so a stale guest list is never shown.
 */
export const useMealRecipes = (
  mealId: Id | undefined,
  query: { q?: string; course?: string; limit?: number },
  enabled = true,
) =>
  useQuery({
    queryKey: ['mealRecipes', mealId, query],
    queryFn: () => api.searchRecipesForMeal(mealId!, query),
    enabled: !!mealId && enabled,
    gcTime: 0,
    placeholderData: keepPreviousData,
  })

export const useMeal = (id: Id) =>
  useQuery({ queryKey: ['meal', id], queryFn: () => api.getMeal(id) })

export const useSuggestions = (
  mealId: Id,
  course: Parameters<typeof api.getSuggestions>[1] | null,
) =>
  useQuery({
    queryKey: ['suggestions', mealId, course],
    queryFn: () => api.getSuggestions(mealId, course!),
    enabled: !!course,
    gcTime: 0,
  })

export const useRecipes = (query: string, filters: RecipeFilters) =>
  useQuery({
    queryKey: ['recipes', query, filters],
    queryFn: () => api.searchRecipes(query, filters),
    placeholderData: keepPreviousData,
  })

export const useTags = () => useQuery({ queryKey: ['tags'], queryFn: () => api.getTags() })

export const useRecipe = (id: Id) =>
  useQuery({ queryKey: ['recipe', id], queryFn: () => api.getRecipe(id) })
export const useVersion = (id: Id) =>
  useQuery({ queryKey: ['version', id], queryFn: () => api.getVersion(id) })
export const useRecipeShares = () =>
  useQuery({ queryKey: ['shares'], queryFn: () => api.getRecipeShares() })
export const useCollections = () =>
  useQuery({ queryKey: ['collections'], queryFn: () => api.getCollections() })
export const useHousehold = () =>
  useQuery({ queryKey: ['household'], queryFn: () => api.getHousehold() })
export const useContacts = () =>
  useQuery({ queryKey: ['contacts'], queryFn: () => api.getContacts() })

/**
 * Every household that can be put on a guest list (yours first, then your contacts) with members and constraint
 * text, for `HouseholdSearch`. Empty until both queries load.
 */
export function useGuestPool(): PickableHousehold[] {
  const own = useHousehold().data
  const contacts = useContacts().data
  const list = [...(own ? [own] : []), ...(contacts ?? [])]
  return list.map((h) => ({
    id: h.id,
    name: h.name,
    members: h.people.map((p) => ({
      id: p.id,
      name: p.name,
      isChild: !!p.isChild,
      constraints: p.constraints.map((c) => ({
        text: c.label,
        strict: c.severity === 'strict',
        strictAllergy: c.tagType === 'allergen' && c.severity === 'strict',
      })),
    })),
  }))
}
export const usePerson = (id: Id) =>
  useQuery({ queryKey: ['person', id], queryFn: () => api.getPerson(id) })
/** The whole list under `['shopping']`; with `mealIds`, just those meals' amounts (under `['shopping', ...ids]`). */
export const useShopping = (mealIds?: Id[]) => {
  const ids = mealIds?.length ? [...mealIds].sort() : []
  return useQuery({
    queryKey: ids.length ? ['shopping', ...ids] : ['shopping'],
    queryFn: () => api.getShoppingList(ids.length ? ids : undefined),
  })
}
export const usePrep = () => useQuery({ queryKey: ['prep'], queryFn: () => api.getPrepSchedule() })
export const useKitchen = () => useQuery({ queryKey: ['kitchen'], queryFn: () => api.getKitchen() })
export const usePantry = () => useQuery({ queryKey: ['pantry'], queryFn: () => api.getPantry() })

export const useHouseholdInfo = () =>
  useQuery({ queryKey: ['info'], queryFn: () => api.getHouseholdInfo(), staleTime: 60_000 })
export const usePrefs = () => useQuery({ queryKey: ['prefs'], queryFn: () => api.getPrefs() })
export const useApiKeys = () => useQuery({ queryKey: ['keys'], queryFn: () => api.listApiKeys() })

/** Today in the household's time zone (never the viewer's clock). Undefined until it loads. */
export const useToday = (): ISODate | undefined => useHouseholdInfo().data?.today

/**
 * What a change makes stale. Each mutation names the groups it touches, so one edit does not
 * refetch the whole app.
 */
export const stale = {
  /** A meal's name, kind or guests; the plan screens show it. */
  meal: [['meal'], ['calendar'], ['upcoming']],
  /** Who is coming or what kind of meal: the brief and the picker change, the lists do not. */
  who: [['meal'], ['calendar'], ['upcoming'], ['suggestions']],
  /** A menu change: the meal, its suggestions, and everything that depends on menus. */
  menu: [['meal'], ['calendar'], ['upcoming'], ['suggestions'], ['shopping'], ['prep'], ['pantry']],
  /** Anything on the Plan tab or a hosted page: weeks, runs, hosted rows, recipe searches for a meal. */
  plan: [
    ['plan'],
    ['hosted'],
    ['hostedMeal'],
    ['mealRecipes'],
    ['meal'],
    ['calendar'],
    ['upcoming'],
  ],
  /** A change to a menu also moves shopping, prep and the pantry. */
  planMenu: [
    ['plan'],
    ['hosted'],
    ['hostedMeal'],
    ['mealRecipes'],
    ['meal'],
    ['calendar'],
    ['upcoming'],
    ['suggestions'],
    ['shopping'],
    ['prep'],
    ['pantry'],
  ],
  /** Who is who: a person's constraints change briefs, suggestions and "safe for". */
  people: [['household'], ['contacts'], ['person'], ['meal'], ['suggestions'], ['recipes']],
  /** Notes and reactions: the person, plus what ranks suggestions and the recipe page. */
  reactions: [['person'], ['household'], ['contacts'], ['suggestions'], ['recipe']],
  recipes: [
    ['recipes'],
    ['recipe'],
    ['version'],
    ['tags'],
    ['collections'],
    ['meal'],
    ['suggestions'],
  ],
  collections: [['collections']],
  shopping: [['shopping']],
  /** Done marks only change the prep list (and the next-task line the tabs show). */
  prep: [['prep']],
  pantry: [['pantry'], ['shopping'], ['suggestions']],
  kitchen: [['kitchen']],
  settings: [['info'], ['prefs'], ['calendar'], ['upcoming'], ['prep']],
  keys: [['keys']],
} satisfies Record<string, QueryKey[]>

const invalidate = (qc: QueryClient, keys: QueryKey[]) =>
  Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })))

/** A mutation that refreshes only the queries it names (see `stale`). */
export function useApiMutation<A, R>(fn: (arg: A) => Promise<R>, keys: QueryKey[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await invalidate(qc, keys)
    },
  })
}

/**
 * A mutation that shows its result straight away: `apply` edits the cached `key` before the request goes
 * out, and a failure puts back what the server has. When the server answers with the new data (`fromResult`),
 * that goes into the cache instead of a refetch. The other `keys` refresh in the background, once the last of
 * a quick run of changes (several boxes ticked in a row) has landed, so a refetch never undoes a pending tap.
 */
export function useOptimisticMutation<A, R, T>(opts: {
  fn: (arg: A) => Promise<R>
  key: QueryKey
  apply: (old: T, arg: A) => T
  fromResult?: (r: R) => T
  keys?: QueryKey[]
}) {
  const qc = useQueryClient()
  const { key, apply, fromResult, keys = [] } = opts
  const mutationKey = ['optimistic', ...key]
  const last = () => qc.isMutating({ mutationKey }) <= 1
  return useMutation({
    mutationKey,
    mutationFn: opts.fn,
    onMutate: async (arg: A) => {
      await qc.cancelQueries({ queryKey: key })
      qc.setQueryData<T>(key, (old) => (old === undefined ? old : apply(old, arg)))
    },
    onSuccess: (r) => {
      if (fromResult && last()) qc.setQueryData<T>(key, fromResult(r))
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: key })
    },
    onSettled: (_r, err) => {
      if (!last()) return
      const refresh = fromResult && !err ? keys : [key, ...keys]
      void invalidate(qc, refresh)
    },
  })
}

/**
 * Tick prep tasks off (or back on) by task id. The list updates at once; a quick run of ticks refetches once
 * they have all landed.
 */
export const useSetPrepDone = () =>
  useOptimisticMutation({
    fn: (marks: { key: Id; done: boolean }[]) => api.setPrepDone(marks),
    key: ['prep'],
    apply: (old: PrepDay[], marks) => {
      const done = new Map(marks.map((m) => [m.key, m.done]))
      return old.map((d) => ({
        ...d,
        tasks: d.tasks.map((t) => (done.has(t.id) ? { ...t, done: done.get(t.id)! } : t)),
      }))
    },
  })

/** Replaces one meal inside a cached hosted page, or a cached single meal. */
function patchMeal(qc: QueryClient, mealId: Id, edit: (m: HostedMeal) => HostedMeal) {
  qc.setQueriesData<HostedPage>({ queryKey: ['hosted'] }, (old) =>
    old
      ? {
          ...old,
          days: old.days.map((d) => ({
            ...d,
            meals: d.meals.map((m) => (m.id === mealId ? edit(m) : m)),
          })),
        }
      : old,
  )
  qc.setQueriesData<HostedMeal>({ queryKey: ['hostedMeal', mealId] }, (old) =>
    old ? edit(old) : old,
  )
}

/**
 * A change to one meal that shows at once. `apply` edits the cached meal before the request goes out (omit
 * it where the result cannot be guessed); the server's answer is the whole meal, so that replaces it and the
 * pages that show it need no refetch. Everything else that depends on the menu (the page's list of things
 * to fix, shopping, prep) refreshes in the background, so nothing waits on it.
 */
function useMealMutation<A extends { mealId: Id }>(
  fn: (arg: A) => Promise<HostedMeal>,
  apply?: (meal: HostedMeal, arg: A) => HostedMeal,
) {
  const qc = useQueryClient()
  const mutationKey = ['mealEdit']
  const last = () => qc.isMutating({ mutationKey }) <= 1
  return useMutation({
    mutationKey,
    mutationFn: fn,
    onMutate: async (arg: A) => {
      if (!apply) return
      await qc.cancelQueries({ queryKey: ['hosted'] })
      await qc.cancelQueries({ queryKey: ['hostedMeal', arg.mealId] })
      patchMeal(qc, arg.mealId, (m) => apply(m, arg))
    },
    onSuccess: (meal, arg) => {
      if (last()) patchMeal(qc, arg.mealId, () => meal)
    },
    onError: () => {
      void invalidate(qc, [['hosted'], ['hostedMeal']])
    },
    onSettled: () => {
      if (!last()) return
      void invalidate(qc, [
        ['plan'],
        ['hosted'],
        ['mealRecipes'],
        ['meal'],
        ['calendar'],
        ['upcoming'],
        ['suggestions'],
        ['shopping'],
        ['prep'],
        ['pantry'],
      ])
    },
  })
}

// ---- Plan tab mutations. Each returns the changed meal as a hosted row, where the server sends one. ----

/** Create a meal in a slot (name optional, hosted optional, guest households optional). */
export const useCreatePlanMeal = () =>
  useApiMutation((input: NewMealInput) => api.createPlanMeal(input), stale.plan)

/** The default meal of a holy day ("Plan Seder I →"); creates it if needed and returns its id. */
export const useEnsureRunMeal = () =>
  useApiMutation(
    (input: { runKey: string; holyDate: ISODate; part: 'night' | 'day' }) =>
      api.ensureRunMeal(input),
    stale.plan,
  )

export const useUpdatePlanMeal = () =>
  useApiMutation(
    (a: { mealId: Id; patch: MealPatch }) => api.updatePlanMeal(a.mealId, a.patch),
    stale.plan,
  )

/** Deletes one variation of a recipe (the page asks for confirmation first). */
export const useDeleteVersion = () =>
  useApiMutation((versionId: Id) => api.deleteVersion(versionId), stale.recipes)

/** Soft-deletes the meal (the page asks for confirmation first). */
export const useDeletePlanMeal = () =>
  useApiMutation((mealId: Id) => api.deleteMeal(mealId), stale.planMenu)

export const useAddMealHousehold = () =>
  useMealMutation((a: { mealId: Id; householdId: Id }) =>
    api.addMealHousehold(a.mealId, a.householdId),
  )
export const useRemoveMealHousehold = () =>
  useMealMutation(
    (a: { mealId: Id; householdId: Id }) => api.removeMealHousehold(a.mealId, a.householdId),
    (m, a) => ({ ...m, households: m.households.filter((h) => h.householdId !== a.householdId) }),
  )
/** A member chip: `present` true is coming. */
export const useSetMealPerson = () =>
  useMealMutation(
    (a: { mealId: Id; personId: Id; present: boolean }) =>
      api.setMealPerson(a.mealId, a.personId, a.present),
    (m, a) => ({
      ...m,
      households: m.households.map((h) => ({
        ...h,
        members: h.members.map((p) =>
          p.personId === a.personId ? { ...p, present: a.present } : p,
        ),
      })),
    }),
  )
export const useAddMealDish = () =>
  useMealMutation((a: { mealId: Id; dish: AddDishInput }) => api.addMealDish(a.mealId, a.dish))
export const useUpdateMealDish = () =>
  useMealMutation(
    (a: { mealId: Id; itemId: Id; change: UpdateDishInput }) =>
      api.updateMealDish(a.mealId, a.itemId, a.change),
    (m, a) => ({
      ...m,
      menu: m.menu.map((c) => ({
        ...c,
        items: c.items.map((i) =>
          i.itemId === a.itemId
            ? {
                ...i,
                ...(a.change.description !== undefined && { title: a.change.description }),
                ...(a.change.broughtBy !== undefined && { broughtBy: a.change.broughtBy }),
              }
            : i,
        ),
      })),
    }),
  )
export const useRemoveMealDish = () =>
  useMealMutation(
    (a: { mealId: Id; itemId: Id }) => api.removeMealDish(a.mealId, a.itemId),
    (m, a) => ({
      ...m,
      menu: m.menu.map((c) => ({ ...c, items: c.items.filter((i) => i.itemId !== a.itemId) })),
    }),
  )
export const useMoveMealDish = () =>
  useMealMutation((a: { mealId: Id; itemId: Id; course: string; beforeItemId?: Id }) =>
    api.moveMealDish(a.mealId, a.itemId, { course: a.course, beforeItemId: a.beforeItemId }),
  )
/** A new empty contact household, for the last row of the household search. */
const byName = (a: Household, b: Household) => a.name.localeCompare(b.name)

/**
 * A new contact household, with its people when given, in one request. It goes into the People list as soon as
 * the server answers; everything that depends on people refreshes behind it rather than holding the screen.
 */
export function useCreateContactHousehold() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (a: string | { name: string; people?: NewPerson[] }) =>
      typeof a === 'string'
        ? api.createContactHousehold(a)
        : api.createContactHousehold(a.name, a.people),
    onSuccess: (h) => {
      qc.setQueryData<Household[]>(['contacts'], (old) => old && [...old, h].sort(byName))
      void invalidate(qc, stale.people)
    },
  })
}

/** Several people added to one household at once (each with their constraints), shown as soon as they land. */
export function useAddPeople(household: { id: Id; isOwn: boolean }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (people: NewPerson[]) =>
      Promise.all(
        people.map((p) =>
          api.addPerson({ ...p, ...(household.isOwn ? {} : { contactHouseholdId: household.id }) }),
        ),
      ),
    onSuccess: (added) => {
      const add = (h: Household): Household =>
        h.id === household.id ? { ...h, people: [...h.people, ...added] } : h
      if (household.isOwn) qc.setQueryData<Household>(['household'], (old) => old && add(old))
      else qc.setQueryData<Household[]>(['contacts'], (old) => old?.map(add))
      void invalidate(qc, stale.people)
    },
  })
}

/**
 * A version edit as the recipe page will show it once saved. Ingredients and steps are left for the server
 * (it structures them), so only the plain fields change here; the refetch after the save fills in the rest.
 */
export function applyVersionEdit(old: Recipe, versionId: Id, edit: VersionEdit): Recipe {
  const {
    recipeTitle,
    course,
    flags,
    nutrition,
    sources,
    ingredients: _i,
    steps: _s,
    ...plain
  } = edit
  return {
    ...old,
    ...(recipeTitle !== undefined && { title: recipeTitle }),
    ...(course !== undefined && { course }),
    versions: old.versions.map((v) =>
      v.id !== versionId
        ? v
        : {
            ...v,
            ...plain,
            ...(flags && { flags: Object.keys(flags).filter((f) => flags[f]) }),
            ...(nutrition !== undefined && { nutrition: nutrition ?? undefined }),
            ...(sources && {
              sources: sources.map((l) => ({ label: l.label ?? l.url, url: l.url })),
            }),
          },
    ),
  }
}

/**
 * Records, changes or clears (`none`) what a person thought of a version. The recipe page shows it at once;
 * the page's other data (suggestions, the person's page) refreshes in the background.
 */
export const useRecordReaction = (recipeId: Id) =>
  useOptimisticMutation({
    fn: (a: {
      personId: Id
      personName: string
      versionId: Id
      reaction: 'like' | 'dislike' | 'none'
    }) => api.recordReaction(a.personId, a.versionId, a.reaction),
    key: ['recipe', recipeId],
    apply: (old: Recipe, a) => ({
      ...old,
      versions: old.versions.map((v) =>
        v.id !== a.versionId
          ? v
          : {
              ...v,
              reactions: [
                ...v.reactions.filter((r) => r.personId !== a.personId),
                ...(a.reaction === 'none'
                  ? []
                  : [
                      {
                        personId: a.personId,
                        personName: a.personName,
                        kind: a.reaction,
                        recordedBy: 'you',
                        date:
                          v.reactions.find((r) => r.personId === a.personId)?.date ??
                          new Date().toISOString().slice(0, 10),
                      },
                    ]),
              ],
            },
      ),
    }),
    keys: stale.reactions.filter(([k]) => k !== 'recipe'),
  })

/** Saves an edit to a version of `recipeId`; the recipe page shows it at once. */
export const useSaveVersion = (recipeId: Id) =>
  useOptimisticMutation({
    fn: (a: { versionId: Id; edit: VersionEdit }) => api.saveVersion(a.versionId, a.edit),
    key: ['recipe', recipeId],
    apply: (old: Recipe, a) => applyVersionEdit(old, a.versionId, a.edit),
    keys: stale.recipes.filter(([k]) => k !== 'recipe'),
  })
