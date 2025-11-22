# Cruzadas

A modern, responsive crossword puzzle game built with Next.js and TypeScript.

Play at: [https://cruzadas-palavras.vercel.app/](https://cruzadas-palavras.vercel.app/)

![Cruzadas Preview](/icon.png)

## Features

- **Interactive Grid**: Smooth navigation with keyboard support (Arrow keys, Backspace).
- **Responsive Design**: Optimized for both Desktop and Mobile devices.
- **Smart Input**: 
  - Highlights the active word and corresponding clue.
  - Mobile-friendly hidden input for native keyboard integration.
  - Debounced input handling for reliable typing.
- **Verification**: Instant feedback on puzzle completion.
- **PWA Ready**: Includes proper icons and metadata for home screen installation.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: CSS Modules for scoped, performant styling.
- **Deployment**: Optimized for Vercel.

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jeromevonk/crosswords.git
   cd crosswords
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open the game:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `src/app`: Next.js App Router pages and layouts.
- `src/components`: Reusable React components (Grid, ClueList, etc.).
- `src/lib`: Utility functions and type definitions.
- `public/data`: Puzzle JSON data files.

## How to Play

1. **Select a Cell**: Click on any white square in the grid.
2. **Read the Clue**: The active clue will be highlighted in the list (and vice-versa).
3. **Type Your Answer**: Use your keyboard to fill in the word.
   - **Arrow Keys**: Move cursor.
   - **Space/Click**: Toggle direction (Across/Down).
   - **Backspace**: Delete character and move back.
4. **Verify**: Click the "Verificar" button to check your answers.

## Adding New Puzzles

Puzzles are stored in `public/data/{id}/puzzle.json`. To add a new puzzle:
1. Create a new folder in `public/data/`.
2. Add a `puzzle.json` file following the existing schema (Grid size, Clues, Answers).
