# MineChess — Frontend

MineChess is chess with a twist: after every move you secretly place a landmine on
an empty square. Step onto a live mine with anything but a pawn and the piece is
destroyed. This package is the React + TypeScript client.

## Tech stack

- **React 18** + **TypeScript**, bundled with **Vite**
- **Redux Toolkit** for game state
- **Tailwind CSS** for styling
- **react-aria-components** for the board-color picker
- **lottie-react** for the explosion / bombman animations
- Realtime play over a **WebSocket** to the Go backend

## Getting started

```bash
npm install
npm run dev      # start the Vite dev server
npm run build    # type-check and produce a production build
npm run lint     # run ESLint
npm run preview  # preview the production build
```

The client talks to the backend at the URLs configured in
[`src/config/environment.ts`](src/config/environment.ts). Override them with the
`VITE_API_URL` and `VITE_WS_URL` environment variables; they default to
`http://localhost:3000` and `ws://localhost:3000`.

## Project layout

| Path | Responsibility |
| --- | --- |
| `src/components` | React components (board, pieces, player controls, …) |
| `src/store` | Redux Toolkit slice, store and typed hooks |
| `src/gameLogic` | Pure move-generation and rules helpers |
| `src/services` | REST + WebSocket clients and player identity |
| `src/utils` | Asset lookups (pieces, sounds, highlights) |
| `src/types` | Shared TypeScript types |
</content>
