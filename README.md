<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/software-mansion/react-native-executorch/raw/main/docs/static/img/logo-vertical-dark.svg">
    <img src="https://github.com/software-mansion/react-native-executorch/raw/main/docs/static/img/logo-vertical.svg" alt="React Native ExecuTorch" width="260">
  </picture>
  <br />
  <br />
  <img src="media/gallery-title.svg" alt="Gallery" width="280">
</div>

<br />
<br />

**React Native ExecuTorch Gallery** is a showcase app demonstrating on-device
machine learning tasks built with
[`react-native-executorch`](https://github.com/software-mansion/react-native-executorch).
Each screen is a real, standalone example of idiomatic library usage, so it can
be lifted straight into your own app.

<div align="center">

|                             **LLM Chat (LFM 2.5)**                             |                              **Text to Image (SDXS)**                               |                          **Text to Speech (Kokoro)**                           |                          **OCR Text Recognition**                          |
| :----------------------------------------------------------------------------: | :---------------------------------------------------------------------------------: | :----------------------------------------------------------------------------: | :------------------------------------------------------------------------: |
|       <img src="media/llm-chat-framed.svg" width="195" alt="LLM Chat" />       |    <img src="media/text-to-image-framed.svg" width="195" alt="Text to Image" />     | <img src="media/text-to-speech-framed.svg" width="195" alt="Text to Speech" /> |    <img src="media/ocr-framed.svg" width="195" alt="OCR Recognition" />    |
|                          **Multimodal Search (CLIP)**                          |                              **Instance Segmentation**                              |                            **Privacy Filter (PII)**                            |                            **Gallery Overview**                            |
| <img src="media/multimodal-search-framed.svg" width="195" alt="CLIP Search" /> | <img src="media/instance-segmentation-framed.svg" width="195" alt="Segmentation" /> | <img src="media/privacy-filter-framed.svg" width="195" alt="Privacy Filter" /> | <img src="media/gallery-menu-framed.svg" width="195" alt="Gallery Menu" /> |

</div>

## Getting Started

```bash
npm install
npm run ios       # or npm run android
```

> [!IMPORTANT]
> The app requires a development build (Expo Go is not supported). Models are
> downloaded on first use and then run fully offline.

## Requirements

- **Expo SDK 57** and **React Native 0.86**
- **iOS 17.0+**
- **Android 13.0+**

## Development & Local Linking

This showcase app is developed against the `rne-rewrite` branch of [`react-native-executorch`](https://github.com/software-mansion/react-native-executorch).

Because the gallery consumes `react-native-executorch` as a standard npm dependency with native modules rather than an npm workspace symlink, local development uses a local [Verdaccio](https://verdaccio.org/) registry (`http://localhost:4873`):

1. **Start Verdaccio**:

   ```bash
   npx verdaccio
   ```

2. **Authenticate & Publish the library** (from the `react-native-executorch` repository):

   ```bash
   # Log in once to your local Verdaccio registry (enter any username/password)
   npm adduser --registry http://localhost:4873

   # Build and publish react-native-executorch
   cd packages/react-native-executorch
   npm publish --registry http://localhost:4873 --tag dev
   ```

3. **Install in the gallery**:

   ```bash
   # In react-native-executorch-gallery:
   npm install react-native-executorch@dev --registry http://localhost:4873
   ```

4. **Run the app**:

   ```bash
   npx pod-install   # for iOS
   npm run ios       # or npm run android
   ```

## Documentation

The full library documentation, task guides, architecture deep dives, and API references live in the main [`react-native-executorch`](https://github.com/software-mansion/react-native-executorch) repository. Each task screen in this showcase maps directly to an extension guide in the docs:

**[docs.swmansion.com/react-native-executorch](https://docs.swmansion.com/react-native-executorch/)**

## Created by Software Mansion

Since 2012, [Software Mansion](https://swmansion.com) has been building mobile and web apps, contributing to open-source software, and dealing with all kinds of React Native challenges. We are Core React Native Contributors. We can help you build your next AI product – [Hire us](https://swmansion.com/contact?utm_source=react-native-executorch-gallery&utm_medium=readme).

[![swm](https://logo.swmansion.com/logo?color=white&variant=desktop&width=150&tag=react-native-executorch-gallery-github 'Software Mansion')](https://swmansion.com)
