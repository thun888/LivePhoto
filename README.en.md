# LivePhoto

A JavaScript library for parsing and displaying Live Photos on the web. It supports both Android Motion Photos and Apple Live Photos.

[English](/README.en.md) | [中文](/README.md)

![](/images/preview.gif)

## Features

-  **Multi-format Support**:
  - Android Motion Photos
  - Apple Live Photos (.livp)
  - Supports HEIC format images
  - Combined static image + video pairs



## Installation

Install via npm:

```bash
npm install @thun888/live-photo
```

## Quick Start

### 1. Import Resources

You can import via npm or use the pre-built files directly.

**ES Module:**

```javascript
import { init } from '@thun888/live-photo';
import '@thun888/live-photo/dist/main.css'; // Import styles

// Initialize
init('.livephoto-item');
```

**Browser (Script Tag):**

```html
<link rel="stylesheet" href="path/to/dist/main.css">
<script src="path/to/dist/bundle.js"></script>

<script>
  document.addEventListener('DOMContentLoaded', () => {
    LivePhoto.init('.livephoto-item');
  });
</script>
```

> `bundle.js` includes HEIC dependency handling. If not needed, you can import `main.js` and it will load dynamically when required.

### 2. HTML Structure

Create a container with a specific class (e.g., `livephoto-item`) and configure the image and options via `data-*` attributes.

```html
<div
  class="livephoto-item"
  data-image="./path/to/motion-photo.jpg"
  data-alt="Android Motion Photo"
></div>

<div
  class="livephoto-item"
  data-image="./path/to/apple-live-photo.livp"
  data-alt="Apple Live Photo"
></div>

<div
  class="livephoto-item"
  data-image="./image.jpg"
  data-video="./video.mp4"
  data-width="400"
  data-height="300"
></div>
```

## Configuration (Data Attributes)

All configurations are set via the `data-*` attributes of the HTML element:

| Attribute | Required | Description | Example |
| --- | --- | --- | --- |
| `data-image` | **Yes** | URL of the image file. Videos will be parsed from this for Live Photos. | `data-image="photo.jpg"` |
| `data-video` | No | URL of the video file. If provided, manual parsing is skipped. | `data-video="video.mp4"` |
| `data-width` | No | Container width. Defaults to automatic image dimensions if unset. | `data-width="300"` |
| `data-height` | No | Container height. | `data-height="400"` |
| `data-type` | No | Force a parsing type (`android` or `apple`). Auto-detected by default. | `data-type="apple"` |
| `data-muted` | No | Whether to play muted. Defaults to `true`. | `data-muted="true"` |
| `data-alt` | No | Alternative text for the image. | `data-alt="Example Image"` |

## Development

1. **Install Dependencies**

```bash
npm install
```


2. **Build**

```bash
npm run build
```

## Acknowledgments

1. [测试不基于 LivePhotoKit JS 实现实况照片 - 陪她去流浪](https://blog.twofei.com/1603/)
2. [解析Android的动态照片 - 星外之神的博客 | wszqkzqk Blog](https://wszqkzqk.github.io/2024/08/01/解析Android的动态照片/)
3. [wszqkzqk/live-photo-conv: Live Photo Converter is a cross-platform tool to process live photos (or motion photos)](https://github.com/wszqkzqk/live-photo-conv)

## License

MIT