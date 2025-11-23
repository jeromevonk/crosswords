"use client";

import React, { useCallback, useEffect, useRef } from 'react';
import styles from './Grid.module.css';
import { GridData, Direction } from '@/lib/types';

interface GridProps {
    grid: GridData;
    activeCell: { r: number; c: number } | null;
    direction: Direction;
    activeWord?: { row: number; col: number; direction: Direction; answer: string } | null;
    onCellClick: (r: number, c: number) => void;
    onGridChange: (newGrid: GridData) => void;
    onMoveCursor: (r: number, c: number, dir: Direction, forward: boolean) => void;
    onDirectionChange: (dir: Direction) => void;
}

export const Grid: React.FC<GridProps> = ({
    grid,
    activeCell,
    direction,
    activeWord,
    onCellClick,
    onGridChange,
    onMoveCursor,
    onDirectionChange
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const lastProcessedTime = useRef<number>(0);

    // Focus input when cell is clicked (triggers mobile keyboard)
    useEffect(() => {
        if (activeCell && inputRef.current) {
            inputRef.current.focus();
        }
    }, [activeCell]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!activeCell || grid.length === 0) return;

        const { r, c } = activeCell;
        const key = e.key;

        // If hidden input is focused, let it handle letters/backspace to avoid double processing
        // but still allow arrow keys for navigation
        const isInputFocused = document.activeElement === inputRef.current;
        if (isInputFocused && (key === 'Backspace' || /^[a-zA-Z]$/.test(key))) {
            return;
        }

        if (key === 'ArrowRight') {
            if (direction === 'down') onDirectionChange('across');
            else onMoveCursor(r, c, 'across', true);
        } else if (key === 'ArrowLeft') {
            if (direction === 'down') onDirectionChange('across');
            else onMoveCursor(r, c, 'across', false);
        } else if (key === 'ArrowDown') {
            if (direction === 'across') onDirectionChange('down');
            else onMoveCursor(r, c, 'down', true);
        } else if (key === 'ArrowUp') {
            if (direction === 'across') onDirectionChange('down');
            else onMoveCursor(r, c, 'down', false);
        } else if (key === 'Backspace') {
            // Debounce check
            const now = Date.now();
            if (now - lastProcessedTime.current < 50) return;
            lastProcessedTime.current = now;

            const newGrid = [...grid];
            if (newGrid[r][c].value !== '') {
                newGrid[r][c].value = '';
                onGridChange(newGrid);
            } else {
                onMoveCursor(r, c, direction, false);
            }
        } else if (/^[a-zA-Z]$/.test(key)) {
            // Debounce check
            const now = Date.now();
            if (now - lastProcessedTime.current < 50) return;
            lastProcessedTime.current = now;

            const newGrid = [...grid];
            newGrid[r][c].value = key.toUpperCase();
            onGridChange(newGrid);
            onMoveCursor(r, c, direction, true);

            // Check if the word is now complete (all cells filled)
            if (activeWord && window.innerWidth < 768) {
                let isWordComplete = true;
                if (activeWord.direction === 'across') {
                    for (let col = activeWord.col; col < activeWord.col + activeWord.answer.length; col++) {
                        if (newGrid[activeWord.row][col].value === '') {
                            isWordComplete = false;
                            break;
                        }
                    }
                } else {
                    for (let row = activeWord.row; row < activeWord.row + activeWord.answer.length; row++) {
                        if (newGrid[row][activeWord.col].value === '') {
                            isWordComplete = false;
                            break;
                        }
                    }
                }

                // If the word is complete, hide keyboard on mobile
                if (isWordComplete && inputRef.current) {
                    inputRef.current.blur();
                }
            }
        }
    }, [activeCell, direction, grid, onDirectionChange, onGridChange, onMoveCursor]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (grid.length === 0) return <div>Loading...</div>;

    const numCols = grid[0]?.length || 0;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!activeCell || grid.length === 0) {
            // Always keep input clear
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        const { r, c } = activeCell;
        const value = e.target.value;

        // Process letter input from onChange (reliable on all devices)
        if (value && /^[a-zA-Z]$/.test(value)) {
            // Debounce check
            const now = Date.now();
            if (now - lastProcessedTime.current < 50) {
                if (inputRef.current) inputRef.current.value = '';
                return;
            }
            lastProcessedTime.current = now;

            const newGrid = [...grid];
            newGrid[r][c].value = value.toUpperCase();
            onGridChange(newGrid);
            onMoveCursor(r, c, direction, true);

            // Check if the word is now complete (all cells filled)
            if (activeWord && window.innerWidth < 768) {
                let isWordComplete = true;
                if (activeWord.direction === 'across') {
                    for (let col = activeWord.col; col < activeWord.col + activeWord.answer.length; col++) {
                        if (newGrid[activeWord.row][col].value === '') {
                            isWordComplete = false;
                            break;
                        }
                    }
                } else {
                    for (let row = activeWord.row; row < activeWord.row + activeWord.answer.length; row++) {
                        if (newGrid[row][activeWord.col].value === '') {
                            isWordComplete = false;
                            break;
                        }
                    }
                }

                // If the word is complete, hide keyboard on mobile
                if (isWordComplete && inputRef.current) {
                    inputRef.current.blur();
                }
            }
        }

        // Always clear the input
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!activeCell || grid.length === 0) return;
        const { r, c } = activeCell;

        // Handle backspace explicitly as onChange doesn't fire for it on empty input
        if (e.key === 'Backspace') {
            e.preventDefault(); // Prevent default to avoid any browser back navigation or weirdness

            // Debounce check
            const now = Date.now();
            if (now - lastProcessedTime.current < 50) return;
            lastProcessedTime.current = now;

            const newGrid = [...grid];
            if (newGrid[r][c].value !== '') {
                newGrid[r][c].value = '';
                onGridChange(newGrid);
            } else {
                onMoveCursor(r, c, direction, false);
            }
        }
        // Note: We do NOT handle letters here. We let them pass through to onChange.
        // This ensures compatibility with Android where keydown might not have the correct key.
    };

    return (
        <div className={styles.gridWrapper}>
            {/* Hidden input for mobile keyboard */}
            <input
                ref={inputRef}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                maxLength={1}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                style={{
                    position: 'absolute',
                    left: '-9999px',
                    width: '1px',
                    height: '1px',
                    opacity: 0,
                }}
                aria-hidden="true"
            />

            {/* Column headers */}
            <div className={styles.columnHeaders}>
                <div className={styles.cornerCell}></div>
                {Array.from({ length: numCols }, (_, i) => (
                    <div key={`col-${i}`} className={styles.headerCell}>{i + 1}</div>
                ))}
            </div>

            {/* Grid with row headers */}
            <div className={styles.gridWithRows}>
                {grid.map((row, rIndex) => (
                    <div key={`row-${rIndex}`} className={styles.rowContainer}>
                        <div className={styles.rowHeader}>{rIndex + 1}</div>
                        <div className={styles.rowCells}>
                            {row.map((cell, cIndex) => {
                                const isActive = activeCell?.r === rIndex && activeCell?.c === cIndex;

                                // Highlight logic - only highlight cells in the active word
                                let isHighlighted = false;
                                if (activeWord && !cell.isBlack) {
                                    if (activeWord.direction === 'across' && rIndex === activeWord.row) {
                                        // Find the word boundaries
                                        let wordStart = activeWord.col;
                                        let wordEnd = activeWord.col;

                                        // Find word end by looking for black square or grid edge
                                        while (wordEnd < grid[0].length && !grid[activeWord.row][wordEnd].isBlack) {
                                            wordEnd++;
                                        }

                                        if (cIndex >= wordStart && cIndex < wordEnd) {
                                            isHighlighted = true;
                                        }
                                    } else if (activeWord.direction === 'down' && cIndex === activeWord.col) {
                                        let wordStart = activeWord.row;
                                        let wordEnd = activeWord.row;

                                        // Find word end
                                        while (wordEnd < grid.length && !grid[wordEnd][activeWord.col].isBlack) {
                                            wordEnd++;
                                        }

                                        if (rIndex >= wordStart && rIndex < wordEnd) {
                                            isHighlighted = true;
                                        }
                                    }
                                }

                                return (
                                    <div
                                        key={`${rIndex}-${cIndex}`}
                                        className={`
                      ${styles.cell}
                      ${cell.isBlack ? styles.cellBlack : ''}
                      ${isActive ? styles.cellActive : ''}
                      ${!isActive && isHighlighted ? styles.cellHighlight : ''}
                      ${cell.isError ? styles.cellError : ''}
                    `}
                                        onClick={() => !cell.isBlack && onCellClick(rIndex, cIndex)}
                                    >
                                        {cell.value}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
