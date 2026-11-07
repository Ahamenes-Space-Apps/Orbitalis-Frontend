## 10. Visual system and motion

Keep the mock's night-sky look. The tokens below were sampled from the screenshot, so treat them as starting values; two are corrected because the sampled purple fails contrast for small text.

### 10.1 Colour tokens

| Token | Value | Use | Contrast on map background |
| --- | --- | --- | --- |
| `bg.map` | `#10182b` | Sky area | n/a |
| `bg.panel` | `#0c1220` | Side panels | n/a |
| `bg.bar` | `#090d18` | Top bar | n/a |
| `bg.row.selected` | `#16203b` | Selected queue row | n/a |
| `bg.control` | `#1c2540` | Active segmented control, banner | n/a |
| `text.primary` | `#e8ecf6` | Headings, values | 14.96:1 |
| `text.secondary` | `#9aa3b8` | Labels, axes | 6.99:1 |
| `text.muted` | `#7b8499` | Hints, 14 px and above only | 4.72:1 |
| `accent.moving` | `#feb832` | Moving rings, selected halo, slider handle (sampled) | 10.20:1 |
| `accent.variable` | `#a5a1f0` (**proposed**) | Variable rings and labels. The mock's sampled purple is about `#7a76c3`, roughly 3.4:1 or lower. | 7.54:1 |
| `state.ok` | `#5fd0a8` (proposed) | Completed chip icon | 9.33:1 |
| `state.error` | `#ff6b6b` (proposed) | Failed chip icon, error text | 6.37:1 |

The hypothesis colour is chosen at build time and checked with the same contrast calculation.

### 10.2 Encodings

Every category is distinguished by shape and label as well as colour.

| Meaning | Shape | Colour | Label |
| --- | --- | --- | --- |
| Moving candidate | Solid ring | `accent.moving` | `#042` |
| Variable (if U-01 accepted) | Dashed ring | `accent.variable` | `#023` |
| Stationary source (if U-01 accepted) | Small filled dot, no ring | `text.secondary` | none |
| Known object | Small hollow diamond | `text.muted` | Name on hover |
| Planet X hypothesis | Open square on a dotted path | a cool hue distinct from the above | Name on hover |
| Selected | Larger ring, halo, thicker stroke | same as its class | Always labelled |
| Trail | Thin line fading towards earlier frames, arrowhead at the latest | same as its class | none |
| Masked pixel | Transparent; optional faint hatch | n/a | Legend entry |

### 10.3 Type and layout

- Sans-serif for text; monospace with tabular numerals for coordinates, ids and scores, as in the mock.
- Sizes: map labels 12 px or more, body 14 px, queue primary text 15 px.
- Layout: top bar 56 px; queue panel 280 to 320 px and collapsible; detail drawer 360 to 420 px; scrubber 72 px; the map takes the rest. **Nothing overlays the map**: every control is docked to a panel edge.
- Below 1100 px the queue becomes a bottom sheet and the drawer a full-height overlay.

### 10.4 Motion

- Hover and press 120 ms; frame fade-in 200 ms; panel slide 300 ms.
- **No crossfade between frames during playback.** Each exposure has its own wavelength and detector, and blending two of them would draw an image that never existed.
- `prefers-reduced-motion`: no autoplay, no pulses, progress still updates without animation.
- A marker pulses once when newly selected, then stays still.
