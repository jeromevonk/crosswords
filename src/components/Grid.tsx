"use client";

import React, { useCallback, useEffect, useRef } from 'react';
import styles from './Grid.module.css';
import { GridData, Direction } from '@/lib/types';

interface GridProps {
    grid: GridData;
    activeCell: { r: number; c: number } | null;
    direction: Direction;
    activeWord?: { row: number; col: number; direction: Direction } | null;
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

    // Focus input when cell is clicked (triggers mobile keyboard)
    useEffect(() => {
        if (activeCell && inputRef.current) {
            inputRef.current.focus();
        }
    }, [activeCell]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Ignore events from the hidden input (mobile keyboard)
        if (e.target === inputRef.current) return;

        if (!activeCell || grid.length === 0) return;

        const { r, c } = activeCell;
        const key = e.key;

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
            const newGrid = [...grid];
            if (newGrid[r][c].value !== '') {
                newGrid[r][c].value = '';
                onGridChange(newGrid);
            } else {
                onMoveCursor(r, c, direction, false);
            }
        } else if (/^[a-zA-Z]$/.test(key)) {
            const newGrid = [...grid];
            newGrid[r][c].value = key.toUpperCase();
            onGridChange(newGrid);
            onMoveCursor(r, c, direction, true);
        }
    }, [activeCell, direction, grid, onDirectionChange, onGridChange, onMoveCursor]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (grid.length === 0) return <div>Loading...</div>;

    const numCols = grid[0]?.length || 0;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!activeCell || grid.length === 0) return;
        const { r, c } = activeCell;
        const value = e.target.value.toUpperCase();

        if (value && /^[A-Z]$/.test(value)) {
            const newGrid = [...grid];
            newGrid[r][c].value = value;
            onGridChange(newGrid);
            onMoveCursor(r, c, direction, true);
            // Clear input for next character
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!activeCell || grid.length === 0) return;
        const { r, c } = activeCell;

        if (e.key === 'Backspace') {
            e.preventDefault();
            const newGrid = [...grid];
            if (newGrid[r][c].value !== '') {
                newGrid[r][c].value = '';
                onGridChange(newGrid);
            } else {
                onMoveCursor(r, c, direction, false);
            }
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
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
