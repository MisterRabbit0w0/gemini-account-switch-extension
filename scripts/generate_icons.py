"""Generate extension PNG icons (16/48/128) from the brand SVG design."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "icons"
SIZES = (16, 48, 128)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    s = size / 128

    def px(v):
        return v * s

    draw.rounded_rectangle(
        (0, 0, size - 1, size - 1),
        radius=px(28),
        fill=(24, 27, 35, 255),
    )

    def circle(cx, cy, r, color, width):
        bbox = (px(cx - r), px(cy - r), px(cx + r), px(cy + r))
        draw.ellipse(bbox, outline=color, width=max(1, round(px(width))))

    circle(48, 58, 20, (203, 242, 78, 255), 5)
    circle(80, 58, 20, (87, 199, 255, 217), 5)

    draw.polygon(
        [
            (px(64), px(44)),
            (px(73), px(60.5)),
            (px(64), px(77)),
            (px(55), px(60.5)),
        ],
        fill=(203, 242, 78, 77),
    )
    draw.rounded_rectangle(
        (px(38), px(88), px(90), px(93)),
        radius=px(2.5),
        fill=(203, 242, 78, 128),
    )
    draw.rounded_rectangle(
        (px(46), px(97), px(82), px(101)),
        radius=px(2),
        fill=(100, 105, 119, 128),
    )
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        path = OUT / f"icon{size}.png"
        draw_icon(size).save(path, format="PNG")
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
