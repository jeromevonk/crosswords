"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { track } from '@vercel/analytics';
import { Grid } from "@/components/Grid";
import { ClueList } from "@/components/ClueList";
import { GridData, Direction, ClueGroup, Word, PuzzleData } from '@/lib/types';
import { initializeGrid } from '@/lib/game-logic';

export default function Home() {
  const [grid, setGrid] = useState<GridData>([]);
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(null);
  const [direction, setDirection] = useState<Direction>('across');
  const [clues, setClues] = useState<{ across: ClueGroup[]; down: ClueGroup[] }>({ across: [], down: [] });
  const [activeWord, setActiveWord] = useState<{ row: number; col: number; direction: Direction } | null>(null);

  // Analytics tracking
  const [puzzleId] = useState<string>('1');
  const startTimeRef = useRef<number>(Date.now());

  // Helper function to calculate completion percentage
  const calculateCompletion = useCallback((gridData: GridData) => {
    if (gridData.length === 0) return 0;
    let totalCells = 0;
    let filledCells = 0;

    gridData.forEach(row => {
      row.forEach(cell => {
        if (!cell.isBlack) {
          totalCells++;
          if (cell.value !== '') filledCells++;
        }
      });
    });

    return totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;
  }, []);

  useEffect(() => {
    // Load puzzle #1 from its folder
    fetch('/data/1/puzzle.json')
      .then(res => res.json())
      .then((puzzle: PuzzleData) => {
        setGrid(initializeGrid(puzzle));
        setClues(puzzle.clues);

        // Set initial active cell and word
        const firstWord = puzzle.clues.across[0]?.words[0];
        if (firstWord) {
          setActiveCell({ r: firstWord.row, c: firstWord.col });
          setActiveWord({ row: firstWord.row, col: firstWord.col, direction: 'across' });
        }

        // Track puzzle start
        track('puzzle_started', { puzzleId });
      });
  }, [puzzleId]);

  // Track progress when user leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      const completion = calculateCompletion(grid);
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      track('puzzle_progress', { puzzleId, completion, timeSpent });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [grid, puzzleId, calculateCompletion]);

  const handleCellClick = (r: number, c: number) => {
    if (activeCell?.r === r && activeCell?.c === c) {
      // Toggle direction
      const newDir = direction === 'across' ? 'down' : 'across';
      setDirection(newDir);

      // Find the word that contains this cell in the new direction
      const allClues = newDir === 'across' ? clues.across : clues.down;
      for (const group of allClues) {
        for (const word of group.words) {
          // Check if this cell is within this word's range
          if (newDir === 'across' && word.row === r && c >= word.col && c < word.col + word.answer.length) {
            setActiveWord({ row: word.row, col: word.col, direction: newDir });
            return;
          } else if (newDir === 'down' && word.col === c && r >= word.row && r < word.row + word.answer.length) {
            setActiveWord({ row: word.row, col: word.col, direction: newDir });
            return;
          }
        }
      }
    } else {
      setActiveCell({ r, c });

      // Find which word this cell belongs to in current direction
      const allClues = direction === 'across' ? clues.across : clues.down;
      for (const group of allClues) {
        for (const word of group.words) {
          // Check if cell is within this word's range
          if (direction === 'across' && word.row === r && c >= word.col && c < word.col + word.answer.length) {
            setActiveWord({ row: word.row, col: word.col, direction });
            return;
          } else if (direction === 'down' && word.col === c && r >= word.row && r < word.row + word.answer.length) {
            setActiveWord({ row: word.row, col: word.col, direction });
            return;
          }
        }
      }
    }
  };

  const handleClueClick = (clueNumber: number, direction: Direction, word: Word) => {
    setActiveCell({ r: word.row, c: word.col });
    setDirection(direction);
    setActiveWord({ row: word.row, col: word.col, direction });
  };

  const moveCursor = useCallback((r: number, c: number, dir: Direction, forward: boolean) => {
    if (grid.length === 0) return;

    let currR = r;
    let currC = c;
    const rows = grid.length;
    const cols = grid[0].length;

    let steps = 0;
    const maxSteps = rows * cols;

    while (steps < maxSteps) {
      if (dir === 'across') {
        currC += forward ? 1 : -1;
      } else {
        currR += forward ? 1 : -1;
      }

      // Boundary checks
      if (currR < 0 || currR >= rows || currC < 0 || currC >= cols) {
        break;
      }

      if (!grid[currR][currC].isBlack) {
        setActiveCell({ r: currR, c: currC });

        // Find which word this new cell belongs to
        const allClues = dir === 'across' ? clues.across : clues.down;
        for (const group of allClues) {
          for (const word of group.words) {
            // Check if cell is within this word's range
            if (dir === 'across' && word.row === currR && currC >= word.col && currC < word.col + word.answer.length) {
              setActiveWord({ row: word.row, col: word.col, direction: dir });
              return;
            } else if (dir === 'down' && word.col === currC && currR >= word.row && currR < word.row + word.answer.length) {
              setActiveWord({ row: word.row, col: word.col, direction: dir });
              return;
            }
          }
        }
        return;
      }
      steps++;
    }
  }, [grid, clues]);

  const checkGrid = () => {
    const newGrid = grid.map(row =>
      row.map(cell => ({
        ...cell,
        isError: !cell.isBlack && cell.value !== '' && cell.value !== cell.answer
      }))
    );
    setGrid(newGrid);

    // Check if puzzle is completed (all cells correct)
    const isCompleted = newGrid.every(row =>
      row.every(cell => cell.isBlack || cell.value === cell.answer)
    );

    if (isCompleted) {
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      track('puzzle_completed', { puzzleId, timeSpent });
    }
  };

  return (
    <main className="container">
      <h1 className="title">Cruzadas</h1>
      <div className="game-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          <Grid
            grid={grid}
            activeCell={activeCell}
            direction={direction}
            activeWord={activeWord}
            onCellClick={handleCellClick}
            onGridChange={setGrid}
            onMoveCursor={moveCursor}
            onDirectionChange={setDirection}
          />
          <button
            onClick={checkGrid}
            style={{
              padding: '0.8rem 2rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              backgroundColor: '#3CCF8E',
              color: '#332B2E',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'transform 0.1s ease'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Verificar
          </button>
        </div>
        <ClueList
          clues={clues}
          activeWord={activeWord}
          onClueClick={handleClueClick}
        />
      </div>
    </main>
  );
}
