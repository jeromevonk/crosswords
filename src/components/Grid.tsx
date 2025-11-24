"use client";

import React, { useCallback, useEffect, useRef } from 'react';
import styles from './Grid.module.css';
import { GridData, Direction } from '@/lib/types';

interface GridProps {
    grid: GridData;
    activeCell: { r: number; c: number } | null;
    direction: Direction;
    activeWord?: { row: number; col: number; direction: Direction; answer: string } | null;
    activeClue?: { number: number; direction: Direction; text: string } | null;
    onCellClick: (r: number, c: number) => void;
    onGridChange: (newGrid: GridData) => void;
    onMoveCursor: (r: number, c: number, dir: Direction, forward: boolean) => void;
    onDirectionChange: (dir: Direction) => void;
    onNextClue?: () => void;
}

export const Grid: React.FC<GridProps> = ({
    grid,
    activeCell,
    direction,
    activeWord,
    activeClue,
    onCellClick,
    onGridChange,
    onMoveCursor,
    onDirectionChange,
    onNextClue
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const lastProcessedTime = useRef<number>(0);
    const hasUserInteracted = useRef<boolean>(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(false);

    // Detect if we're on mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Track keyboard visibility based on input focus
    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;

        const handleFocus = () => setIsKeyboardVisible(true);
        const handleBlur = () => setIsKeyboardVisible(false);

        input.addEventListener('focus', handleFocus);
        input.addEventListener('blur', handleBlur);

        // Polling mechanism for mobile: check if input is still focused
        let focusCheckInterval: NodeJS.Timeout | null = null;
        if (isMobile) {
            focusCheckInterval = setInterval(() => {
                // If we think keyboard is visible but input is not focused, hide it
                if (isKeyboardVisible && document.activeElement !== input) {
                    setIsKeyboardVisible(false);
                }
            }, 300); // Check every 300ms
        }

        return () => {
            input.removeEventListener('focus', handleFocus);
            input.removeEventListener('blur', handleBlur);
            if (focusCheckInterval) {
                clearInterval(focusCheckInterval);
            }
        };
    }, [isMobile, isKeyboardVisible]);

    // Focus input when cell is clicked (triggers mobile keyboard)
    useEffect(() => {
        if (activeCell && inputRef.current && isMobile && hasUserInteracted.current) {
            inputRef.current.focus();
            // Check if focus actually happened (for desktop mobile view where events might not fire)
            setTimeout(() => {
                if (inputRef.current && document.activeElement === inputRef.current) {
                    setIsKeyboardVisible(true);
                }
            }, 100);
        }
    }, [activeCell, isMobile]);

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

            // Check if the word is now complete (all cells filled)
            let isWordComplete = false;
            if (activeWord && isMobile) {
                if (activeWord.direction === 'across') {
                    isWordComplete = true;
                    for (let col = activeWord.col; col < activeWord.col + activeWord.answer.length; col++) {
                        if (newGrid[activeWord.row][col].value === '') {
                            isWordComplete = false;
                            break;
                        }
                    }
                } else {
                    isWordComplete = true;
                    for (let row = activeWord.row; row < activeWord.row + activeWord.answer.length; row++) {
                        if (newGrid[row][activeWord.col].value === '') {
                            isWordComplete = false;
                            break;
                        }
                    }
                }
            }

            // On mobile, if word is complete, hide keyboard and don't move cursor
            // Otherwise, move cursor normally
            if (isWordComplete && isMobile) {
                if (inputRef.current) {
                    inputRef.current.blur();
                }
            } else {
                onMoveCursor(r, c, direction, true);
            }
        }
    }, [activeCell, direction, grid, activeWord, onDirectionChange, onGridChange, onMoveCursor]);

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

            // Check if the word is now complete (all cells filled)
            let isWordComplete = false;
            if (activeWord && isMobile) {
                if (activeWord.direction === 'across') {
                    isWordComplete = true;
                    for (let col = activeWord.col; col < activeWord.col + activeWord.answer.length; col++) {
                        if (newGrid[activeWord.row][col].value === '') {
                            isWordComplete = false;
                            break;
                        }
                    }
                } else {
                    isWordComplete = true;
                    for (let row = activeWord.row; row < activeWord.row + activeWord.answer.length; row++) {
                        if (newGrid[row][activeWord.col].value === '') {
                            isWordComplete = false;
                            break;
                        }
                    }
                }
            }

            // On mobile, if word is complete, hide keyboard and don't move cursor
            // Otherwise, move cursor normally
            if (isWordComplete && isMobile) {
                if (inputRef.current) {
                    inputRef.current.blur();
                }
            } else {
                onMoveCursor(r, c, direction, true);
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
                name="crossword-cell"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                data-form-type="other"
                data-lpignore="true"
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

            {/* Floating clue banner for mobile when keyboard is visible */}
            {isKeyboardVisible && activeClue && isMobile && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(51, 43, 46, 0.95)',
                    color: '#E8E6E3',
                    padding: '0.5rem 0.75rem',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    zIndex: 1000,
                    borderBottom: '2px solid #3CCF8E',
                    animation: 'slideDown 0.2s ease-out',
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.25rem'
                    }}>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: '#3CCF8E',
                            textTransform: 'capitalize'
                        }}>
                            {activeClue.number} {activeClue.direction === 'across' ? 'Horizontal' : 'Vertical'}
                        </div>
                        {onNextClue && (
                            <button
                                onTouchEnd={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onNextClue();
                                }}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onNextClue();
                                }}
                                style={{
                                    backgroundColor: 'transparent',
                                    border: '1px solid #3CCF8E',
                                    color: '#3CCF8E',
                                    fontSize: '0.7rem',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    pointerEvents: 'auto',
                                    touchAction: 'manipulation',
                                    userSelect: 'none'
                                }}
                            >
                                Next →
                            </button>
                        )}
                    </div>
                    <div style={{
                        fontSize: '0.9rem',
                        lineHeight: '1.3'
                    }}>
                        {activeClue.text} <span style={{ fontSize: '0.75rem', fontWeight: 300, opacity: 0.7 }}>({activeWord?.answer.length} {activeWord?.answer.length === 1 ? 'letra' : 'letras'})</span>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slideDown {
                    from {
                        transform: translateY(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>

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
                                        onClick={() => {
                                            if (!cell.isBlack) {
                                                hasUserInteracted.current = true;
                                                onCellClick(rIndex, cIndex);
                                                // On mobile, always focus input when clicking a cell
                                                // This ensures keyboard shows up even when clicking the same cell
                                                if (isMobile && inputRef.current) {
                                                    inputRef.current.focus();
                                                }
                                            }
                                        }}
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
