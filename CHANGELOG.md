## [3.2.2](https://github.com/BeezyWorks/tavshil/compare/v3.2.1...v3.2.2) (2026-11-24)


### Bug Fixes

* **app:** fold passive prep waits into their step ([048b09f](https://github.com/BeezyWorks/tavshil/commit/048b09f1c990ace716d18262016b88f27ce33f7b))

## [3.2.1](https://github.com/BeezyWorks/tavshil/compare/v3.2.0...v3.2.1) (2026-11-22)


### Bug Fixes

* **ios:** adopt the UIScene lifecycle so iOS 27 doesn't trap at launch ([60f0081](https://github.com/BeezyWorks/tavshil/commit/60f008127720afa7c79afc803d72a693351bee8f))

# [3.2.0](https://github.com/BeezyWorks/tavshil/compare/v3.1.1...v3.2.0) (2026-11-19)


### Features

* **app:** home-screen widget for next meal, shopping, today's prep and the week ([5f7b9a6](https://github.com/BeezyWorks/tavshil/commit/5f7b9a6be7d304129751e0720466d222aeca729d))

## [3.1.1](https://github.com/BeezyWorks/tavshil/compare/v3.1.0...v3.1.1) (2026-11-18)


### Bug Fixes

* **app:** refetch on return from background; tolerate cached meals without dishes ([ee67584](https://github.com/BeezyWorks/tavshil/commit/ee67584172a2002a501f09bcc4f42cb62b382fea))
* **core:** spoons in metric, fats by weight, convert oven temperatures ([0cb0e9a](https://github.com/BeezyWorks/tavshil/commit/0cb0e9adf5ff6a0d14cdd01bce4d2bc78344f683))

# [3.1.0](https://github.com/BeezyWorks/tavshil/compare/v3.0.0...v3.1.0) (2026-11-16)


### Features

* **app:** favicon shows just the pot on a transparent background ([ae4b231](https://github.com/BeezyWorks/tavshil/commit/ae4b231f7b30173cbbee7673d2cecacacf35a02f))
* **app:** step through a meal's dishes from the recipe page ([9f34e45](https://github.com/BeezyWorks/tavshil/commit/9f34e458fd816df0994dff49f34096c1ef9ec1aa))

# [3.0.0](https://github.com/BeezyWorks/tavshil/compare/v2.15.0...v3.0.0) (2026-11-16)


* feat(worker)!: drop draft and accepted meals; prep done marks and richer shopping lines ([aefcf42](https://github.com/BeezyWorks/tavshil/commit/aefcf42e9eefe42b87194b8f63c99007f7c34b49))


### Bug Fixes

* **plan:** open a weeknight dinner instantly, on its dishes ([6a95578](https://github.com/BeezyWorks/tavshil/commit/6a95578c6745d078c878f1d0b2587536aebfc5ac))


### Features

* **app:** cream ground and grouped-surface theme tokens ([a0c2695](https://github.com/BeezyWorks/tavshil/commit/a0c269578d065b57272c311646c1d9625e544e7b))
* **app:** native tabs on iOS and a new top nav on web ([de70463](https://github.com/BeezyWorks/tavshil/commit/de70463aeafdd4df6af8d56b82933b4bf324f417))
* **app:** plan page with tonight card, every meal, month on phone, dinner sheet and panel ([476ca83](https://github.com/BeezyWorks/tavshil/commit/476ca83ceec3398f9d7c0bd0e069684360431297))
* **app:** prep and shopping API without accepting ([d931614](https://github.com/BeezyWorks/tavshil/commit/d93161402a223d5a22c01e8b307abe74a0e7e70d))
* **app:** prep and shopping screens with meal filters ([80a1b3a](https://github.com/BeezyWorks/tavshil/commit/80a1b3a856d664b4132863b1d7d03c25fa46ba40))
* **app:** prep reminders as local notifications ([716a5f0](https://github.com/BeezyWorks/tavshil/commit/716a5f00378b51f9a7f3d68e139810ccb34ff193))
* **app:** reminders bell on Prep; reminders route shared by Prep and More ([dadeb6f](https://github.com/BeezyWorks/tavshil/commit/dadeb6ff7f4089c2ebd2069e80fd4b1d5e14c8bc))
* **core:** prep task keys and rest cut-off, per-meal shopping needs, buy-by and staples ([1959a00](https://github.com/BeezyWorks/tavshil/commit/1959a0038ea09e619c596cee9b3f29a85dff4d17))


### BREAKING CHANGES

* the accept_meals MCP tool is gone, includeDrafts is ignored, and meal views no
longer carry status or acceptedAt. POST /meals/accept and /meals/reopen stay for one release as
documented no-ops so older app builds keep working.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MYqSyN1gvQoC5H6LwJuafh

# [2.15.0](https://github.com/BeezyWorks/tavshil/compare/v2.14.0...v2.15.0) (2026-11-16)


### Features

* **app:** add a whole household in one sheet ([3f7a3b6](https://github.com/BeezyWorks/tavshil/commit/3f7a3b6ca96e28b7424c2cf1b4207f6fe5ec4bf2))

# [2.14.0](https://github.com/BeezyWorks/tavshil/compare/v2.13.0...v2.14.0) (2026-11-13)


### Features

* **app:** privacy policy, about page and in-app account deletion ([02ed3d8](https://github.com/BeezyWorks/tavshil/commit/02ed3d84de05a87983402fe2785505b621dac682))
* **worker:** daily purge of retired rows; account deletion retires the whole household ([5870e93](https://github.com/BeezyWorks/tavshil/commit/5870e93b51f32ca5b7fdc99d7d7875eb08d9b4b2))

# [2.13.0](https://github.com/BeezyWorks/tavshil/compare/v2.12.0...v2.13.0) (2026-11-13)


### Features

* **app:** delete a recipe variation from the recipe page and MCP ([32953ae](https://github.com/BeezyWorks/tavshil/commit/32953ae8f8d3e88c453d6caa275ea906c008ef5e))
* **app:** edit pen toggles the recipe editor, warning before discarding changes ([fa41ed5](https://github.com/BeezyWorks/tavshil/commit/fa41ed595af7fe417abe791bccf54bc5f34dd9aa))
* **app:** guest meals and brought sides, plus kitchen screen ([e968dfc](https://github.com/BeezyWorks/tavshil/commit/e968dfc9aefabb37d30b7d41141fb7df58e0a3d1))
* **app:** share recipe as a QR code with logo, share sheet, sharing-on switch ([4ba6a79](https://github.com/BeezyWorks/tavshil/commit/4ba6a793a63e7a236af3139cab1494135c12b713))

# [2.12.0](https://github.com/BeezyWorks/tavshil/compare/v2.11.0...v2.12.0) (2026-11-10)


### Features

* **app:** animated pot loader ([4fdee0f](https://github.com/BeezyWorks/tavshil/commit/4fdee0f9c2ae7b0589ea1670da9f973f4c2c091e))

# [2.11.0](https://github.com/BeezyWorks/tavshil/compare/v2.10.0...v2.11.0) (2026-11-10)


### Features

* **app:** click a selected saved filter to clear it; edit and delete saved filters ([e9ebc3b](https://github.com/BeezyWorks/tavshil/commit/e9ebc3b592f6bdbae2fe5c978a7052b96780e2f1))

# [2.10.0](https://github.com/BeezyWorks/tavshil/compare/v2.9.1...v2.10.0) (2026-11-10)


### Bug Fixes

* **app:** drop the active-count chip from the recipe filters header ([368a089](https://github.com/BeezyWorks/tavshil/commit/368a0899c0581dc95413eb615519ef7a65010a67))
* **app:** keep the recipe Filters chip from stretching full width ([8ba3583](https://github.com/BeezyWorks/tavshil/commit/8ba3583937aaf67d7c20994d9ceba523c32c07cb))
* **app:** one header for saving a recipe filter; segmented control scrolls on small screens ([fddbf54](https://github.com/BeezyWorks/tavshil/commit/fddbf54caf912ea8bea9e2f656b332e97d223543))
* **app:** wrap page action buttons on phones, clearer back link, שבת as the weekday ([f35706e](https://github.com/BeezyWorks/tavshil/commit/f35706ee087afac58cb14c17d344c7d1117db914))


### Features

* **app:** group menus as main, sides and dessert, with drag and drop, icons and square buttons ([176baf0](https://github.com/BeezyWorks/tavshil/commit/176baf050b1738b1ebc1f378012ee9bcbef6b819))
* **app:** make recipe filters a collapsible header ([14c8bdf](https://github.com/BeezyWorks/tavshil/commit/14c8bdf161f0cce013b8ee38080dcb20d28531f2))
* **app:** quick edits on the recipe page, equipment add, optimistic reactions ([192986e](https://github.com/BeezyWorks/tavshil/commit/192986e8993aff4c2d17ee78f7d26019386cf4ae))
* **app:** say what saving a recipe filter does and confirm it ([4950ceb](https://github.com/BeezyWorks/tavshil/commit/4950cebe060a2fea091b4e70c36c7d585f4ed78e))
* **app:** show saved recipe filters in a labelled row inside the Filters card ([ddf2954](https://github.com/BeezyWorks/tavshil/commit/ddf29547e2514cf4b3b3d41d3ede79ceecc0305e))
* **app:** tidy the host plan page and parse loose meal times ([e493170](https://github.com/BeezyWorks/tavshil/commit/e4931709b037cc8e8ddfb1102efe85856506b6d3))
* **app:** unfold and fold the recipe filters panel ([32234d3](https://github.com/BeezyWorks/tavshil/commit/32234d3518ba0d6744ce11fa8c3b18badf8ef96c))


### Performance Improvements

* **app:** show plan menu and guest edits at once ([064f14d](https://github.com/BeezyWorks/tavshil/commit/064f14dc492254cf24f3c6c02763638e5589b3a9))

## [2.9.1](https://github.com/BeezyWorks/tavshil/compare/v2.9.0...v2.9.1) (2026-11-10)


### Bug Fixes

* **app:** stop recipes crashing on cached data without source links ([55851b7](https://github.com/BeezyWorks/tavshil/commit/55851b7614cad20264647dd8ab39780a988ec3ee))

# [2.9.0](https://github.com/BeezyWorks/tavshil/compare/v2.8.0...v2.9.0) (2026-11-10)


### Features

* **app:** edit several original-recipe links per version, with video links labelled ([0a74845](https://github.com/BeezyWorks/tavshil/commit/0a74845bb5d9d3adddc2fde02bc5bdeb2dbbfa67))

# [2.8.0](https://github.com/BeezyWorks/tavshil/compare/v2.7.0...v2.8.0) (2026-11-10)


### Features

* **worker:** live public recipes, author from profile, MCP coverage ([70e1681](https://github.com/BeezyWorks/tavshil/commit/70e16810bb2efb8a1c25655b59187ddefe0a40ec))

# [2.7.0](https://github.com/BeezyWorks/tavshil/compare/v2.6.0...v2.7.0) (2026-11-10)


### Bug Fixes

* **app:** resolve expo-keep-awake peers in the lockfile ([5d77793](https://github.com/BeezyWorks/tavshil/commit/5d7779300c36112ed833d057c138d4cb746e707b))


### Features

* **app:** cook-mode timer redesign, looping alarm with chosen sound, keep-awake setting ([a16f336](https://github.com/BeezyWorks/tavshil/commit/a16f336d6af35f822b922c27a388f54d23f27139))
* **worker:** public recipes with search, ratings, save-a-copy and anonymous authors ([17256e7](https://github.com/BeezyWorks/tavshil/commit/17256e7fed5ab4bdb53119a12432f71d19eb0f6a))

# [2.6.0](https://github.com/BeezyWorks/tavshil/compare/v2.5.0...v2.6.0) (2026-11-09)


### Bug Fixes

* **app:** hide recipe list until typing in the day editor; shrink add-tag button ([bdc2266](https://github.com/BeezyWorks/tavshil/commit/bdc2266b86e083f5c3610548a7391f8f57972499))


### Features

* **app:** iOS Live Activity for cook timers ([4063d87](https://github.com/BeezyWorks/tavshil/commit/4063d873911fe8b48c874eb8993dea75252f6d04))

# [2.5.0](https://github.com/BeezyWorks/tavshil/compare/v2.4.0...v2.5.0) (2026-11-09)


### Bug Fixes

* **app:** set the App Store Connect app id for Tavshil ([321c243](https://github.com/BeezyWorks/tavshil/commit/321c243c90c1adde7baadcae3f71d2767782ffe6))
* rename deploy script to deploy:prod (pnpm deploy is a built-in) ([17d3344](https://github.com/BeezyWorks/tavshil/commit/17d334479406b54b1b36b4f4ba8c07a77521c4d2))


### Features

* **app:** simplify the meal editor, instant recipe list, Hebrew-only day label ([be80aae](https://github.com/BeezyWorks/tavshil/commit/be80aae7d45a77d761be423927dc7a21abc1a1f4))
* spicy and kid friendly are tags; add a tag from the recipe page ([c9d99d9](https://github.com/BeezyWorks/tavshil/commit/c9d99d99f3bbb0abafa2a54ebda2f97733938cca))
* timer editing in the link editor, tell the MCP to set step timers ([0501ebf](https://github.com/BeezyWorks/tavshil/commit/0501ebf0194f75e37c6ac7ca3c0f72f62b3fbd20))
* timer label and half-minute stepper in the link editor ([2a18be1](https://github.com/BeezyWorks/tavshil/commit/2a18be1d832416019e750455db8db7a7560e9f06))


### Performance Improvements

* optimistic updates and a faster shopping list ([10dd75e](https://github.com/BeezyWorks/tavshil/commit/10dd75eb37cbc38411275a6d241cf1f97a9ae875))

# [2.4.0](https://github.com/BeezyWorks/bishul/compare/v2.3.0...v2.4.0) (2026-11-09)


### Bug Fixes

* **app:** respect iOS safe areas on screens, nav and cooking mode ([77ee9b2](https://github.com/BeezyWorks/bishul/commit/77ee9b2423f3b5b82df26e8bb462cf2d7e18154e))
* **app:** use branded Apple and Google sign-in buttons ([e87ae35](https://github.com/BeezyWorks/bishul/commit/e87ae353852fee2c7a9029e631f77ea97fb416c9))


### Features

* **app:** keep the query cache on the device so screens open offline ([f84795d](https://github.com/BeezyWorks/bishul/commit/f84795d478091708fc270f74313e7cff5a7e174e))
* search recipes by nutrition and tags, require servings ([2b9e449](https://github.com/BeezyWorks/bishul/commit/2b9e449604ff9b2228be217e8347b481965739de))

# [2.3.0](https://github.com/BeezyWorks/bishul/compare/v2.2.1...v2.3.0) (2026-11-09)


### Features

* rename the app to Tavshil ([8bfa39c](https://github.com/BeezyWorks/bishul/commit/8bfa39cade3a84676f2278804f1257acdc17a1f3))


### Performance Improvements

* **worker:** share session checks across isolates through the colo cache ([8c08fe6](https://github.com/BeezyWorks/bishul/commit/8c08fe607048917244ff03d13bfe96df9c08cacb))

## [2.2.1](https://github.com/BeezyWorks/bishul/compare/v2.2.0...v2.2.1) (2026-11-09)


### Bug Fixes

* **app:** set the App Store Connect app id and team for TestFlight submits ([3362e7f](https://github.com/BeezyWorks/bishul/commit/3362e7f5012b8a8308cde2acef7af5dc50f3a12a))

# [2.2.0](https://github.com/BeezyWorks/bishul/compare/v2.1.0...v2.2.0) (2026-11-09)


### Features

* **app:** Google and Apple sign-in on iOS, tagged releases and pnpm ship ([8ddf591](https://github.com/BeezyWorks/bishul/commit/8ddf591f4a30c8eca6d36273a67c9715e5cd677a))
* **app:** iOS build setup, PWA icons and manifest, native storage and API origin ([46914cb](https://github.com/BeezyWorks/bishul/commit/46914cb9d812ac43b9488b550c4983185e54979e))
* **cook:** step timers with notifications and hour-aware clock ([ea07773](https://github.com/BeezyWorks/bishul/commit/ea0777356c4726095931541dd4021ce7339950ac))
* **recipes:** add icons to the recipe screen action buttons ([a9d2352](https://github.com/BeezyWorks/bishul/commit/a9d23524ef1957973244fde613c9cc12cf2bf293))
* **recipes:** show nutrition below the steps on the recipe screen ([a39d388](https://github.com/BeezyWorks/bishul/commit/a39d388fa8f4738eeea9663a7c9aa25c019c6425))


### Performance Improvements

* **app:** start signed in from the cached user ([9293378](https://github.com/BeezyWorks/bishul/commit/9293378f254512bb0478f17bfae45485be3d81f0))
* **plan:** load a week's meal facts in batched queries ([bf9778c](https://github.com/BeezyWorks/bishul/commit/bf9778cf6b2bd97ae856ec99df520dc5492a9a61))
