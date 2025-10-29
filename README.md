# Astrojump

Made for TC1001S @ Tec de Monterrey

A small 2D arcade platformer where the player jumps between platforms, collects points, and avoids obstacles. Intended as a lightweight web/desktop prototype for learning game mechanics and rapid iteration.

## Features
- Single-player platforming with progressive difficulty
- Scoring and high-score persistence (local)
- Simple physics (jump, gravity, collision)
- Configurable controls and level parameters

## Quick start

Clone the repo:
```
git clone https://github.com/<your-org>/jumping-game.git
cd jumping-game
```

If this is a static web project:
- Open `index.html` in a browser
- Or run a simple server:
```
python -m http.server 8000
# then open http://localhost:8000
```

If the project uses Node (package.json present):
```
npm install
npm start
# or npm run dev
```

## Controls
- Arrow keys or A/D: move left/right
- Space / W / Up: jump
- R: restart level

(Adjust keys in source if different.)

## Development
- Code: src/ (or app/)
- Assets: assets/ (images, audio)
- Build: see package.json or build scripts
- Tests: see tests/ (if present)

Write clear commits, open issues for bugs, and propose features via pull requests.

## Contributing
- Fork → branch → commit → PR
- Follow existing code style and add tests for major changes
- Document non-obvious behavior in the README or inline comments

## License
MIT — see LICENSE file.

## Contact
Create an issue or PR in this repository for feedback or help.
