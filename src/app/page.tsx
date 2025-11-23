"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Confetti from 'react-confetti';
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
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Analytics tracking
  const [puzzleId] = useState<string>('1');
  const startTimeRef = useRef<number>(Date.now());

  // Track window size for confetti
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  // Helper function to get localStorage key for current puzzle
  const getStorageKey = useCallback((id: string) => `crossword_progress_${id}`, []);

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

  // Save grid to localStorage whenever it changes
  useEffect(() => {
    if (grid.length > 0 && typeof window !== 'undefined') {
      try {
        // Extract only the user's values to save
        const savedState = grid.map(row =>
          row.map(cell => cell.value)
        );
        localStorage.setItem(getStorageKey(puzzleId), JSON.stringify(savedState));
      } catch (error) {
        console.error('Failed to save progress to localStorage:', error);
      }
    }
  }, [grid, puzzleId, getStorageKey]);

  useEffect(() => {
    // Load puzzle #1 from its folder
    fetch('/data/1/puzzle.json')
      .then(res => res.json())
      .then((puzzle: PuzzleData) => {
        const initialGrid = initializeGrid(puzzle);

        // Try to restore saved progress from localStorage
        if (typeof window !== 'undefined') {
          try {
            const savedState = localStorage.getItem(getStorageKey(puzzleId));
            if (savedState) {
              const savedValues = JSON.parse(savedState);
              // Restore user's values into the initialized grid
              const restoredGrid = initialGrid.map((row, r) =>
                row.map((cell, c) => ({
                  ...cell,
                  value: savedValues[r]?.[c] || ''
                }))
              );
              setGrid(restoredGrid);
            } else {
              setGrid(initialGrid);
            }
          } catch (error) {
            console.error('Failed to load progress from localStorage:', error);
            setGrid(initialGrid);
          }
        } else {
          setGrid(initialGrid);
        }

        setClues(puzzle.clues);

        // Set initial active cell and word
        const firstWord = puzzle.clues.across[0]?.words[0];
        if (firstWord) {
          setActiveCell({ r: firstWord.row, c: firstWord.col });
          setActiveWord({ row: firstWord.row, col: firstWord.col, direction: 'across' });
        }

        // Track puzzle start with GA4
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'puzzle_started', { puzzleId });
        }
      });
  }, [puzzleId, getStorageKey]);

  // Track progress when user leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      const completion = calculateCompletion(grid);
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'puzzle_progress', { puzzleId, completion, timeSpent });
      }
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
    const puzzleComplete = newGrid.every(row =>
      row.every(cell => cell.isBlack || cell.value === cell.answer)
    );

    if (puzzleComplete) {
      setIsCompleted(true);
      // Stop confetti after 5 seconds
      setTimeout(() => setIsCompleted(false), 5000);

      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'puzzle_completed', { puzzleId, timeSpent });
      }
    }
  };

  const clearGrid = () => {
    // Ask for confirmation before clearing
    if (!window.confirm('Tem certeza que deseja limpar todo o progresso?')) {
      return;
    }

    // Clear all cell values
    const clearedGrid = grid.map(row =>
      row.map(cell => ({
        ...cell,
        value: '',
        isError: false
      }))
    );
    setGrid(clearedGrid);

    // Clear localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(getStorageKey(puzzleId));
      } catch (error) {
        console.error('Failed to clear localStorage:', error);
      }
    }
  };

  return (
    <main className="container">
      {isCompleted && (
        <>
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={500}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(51, 43, 46, 0.95)',
              color: '#3CCF8E',
              padding: '2rem 3rem',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              zIndex: 1000,
              textAlign: 'center',
              animation: 'fadeIn 0.5s ease-in',
              border: '2px solid #3CCF8E'
            }}
          >
            <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              🎉 Parabéns!
            </h2>

          </div>
          <style jsx>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
              }
              to {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
              }
            }
          `}</style>
        </>
      )}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', width: '100%', maxWidth: '600px' }}>
            {/* Small trash icon button */}
            <button
              onClick={clearGrid}
              className="clear-button"
              title="Limpar progresso"
              style={{
                padding: '0.6rem',
                fontSize: '1.5rem',
                backgroundColor: 'transparent',
                color: '#888',
                border: '1px solid #888',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '3rem',
                minHeight: '3rem',
                flexShrink: 0
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#FF6B6B';
                e.currentTarget.style.borderColor = '#FF6B6B';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#888';
                e.currentTarget.style.borderColor = '#888';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              🗑️
            </button>
            <button
              onClick={checkGrid}
              className="verify-button"
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
                transition: 'transform 0.1s ease',
                flexGrow: 1,
                maxWidth: '200px'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Verificar
            </button>
            {/* Spacer to balance the layout */}
            <div style={{ minWidth: '3rem', flexShrink: 0 }}></div>
          </div>
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
