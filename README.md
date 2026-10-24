<div align="center">
  <img src="website/img/app-icon.png" height="120">
  <h1>Mini Diary</h1>
  <strong>Simple and secure journal app</strong>
  <img src="website/img/screenshot-1.png" width="100%" alt="Screenshot">
</div>

**Mini Diary is no longer maintained. Please use a different journal app instead.**

## Website

Features and FAQs can be found on the website: [**minidiary.app**](https://minidiary.app)

## Development

The application is built with Electron, React and Lexical, bundled with electron-vite. To run or build the app yourself, you'll need Node.js 22.12+ and Yarn.

### Running the app

1. Clone this repository: `git clone REPO_URL`
2. Navigate into the project directory: `cd mini-diary`
3. Install the dependencies: `yarn`
4. Run the app: `yarn start`

When run from source, the app keeps its data inside the project directory, separate from the installed app: the diary is saved as `mini-diary.txt` and the preferences and backups go into `.dev-user-data/` (both are gitignored).

### Building the app

After cloning the repo and installing the dependencies, run `yarn dist`. A native Apple Silicon app (ad-hoc signed, `.dmg` and `.zip`) can be found in the `dist` folder. Builds are local only: there is no auto-updater and no notarization.

All dependencies are bundled into the app by electron-vite, so they are listed under `devDependencies`.

### Tests

- `yarn test`: Unit tests (Vitest) and type checks
- `yarn lint:ts`, `yarn lint:css`, `yarn format`: Linters and formatting

The tests include regression checks that diary files written by previous versions (v3.x) can still be decrypted and that their Markdown survives the editor round-trip.

## Contributing

### Features and Bugs

Suggestions and contributions are always welcome! Please first discuss changes via issue before submitting a pull request.

### Adding missing translations

The list of all English strings can be found in [`en.ts`](./src/main/i18n/translations/en.ts). If there are translations missing for your language and you'd like to help with the translation, you can add the translated strings to your language's file in [`src/main/i18n/translations`](./src/main/i18n/translations) and submit a PR.

### Adding a new language

If the app isn't translated into your language yet and you'd like to help out, you can easily add translations with the following steps:

1. The translation files can be found in [`src/main/i18n/translations`](./src/main/i18n/translations). Duplicate the [`en.ts`](./src/main/i18n/translations/en.ts) file as `[LANG].ts`, where `[LANG]` is the [shortcode of your language](https://electronjs.org/docs/api/locales).
2. In the file you just created, replace the English translations with your own.
3. Import your file in the `ALL_TRANSLATIONS` object in [`src/main/i18n/i18n.ts`](./src/main/i18n/i18n.ts).
4. Add your language shortcode to the `electronLanguages` array in [`package.json`](./package.json).
5. Run the app in your language (see the steps [above](#development)) and make sure that the translations fit into the app (e.g. that they aren't too long for input fields).
6. Submit a PR. Thanks for your help!
