"""Small interactive window for Conway's Game of Life."""

from collections import Counter
import os
import random


os.environ.setdefault("PYGAME_HIDE_SUPPORT_PROMPT", "1")

import pygame


GRID_WIDTH = 32
GRID_HEIGHT = 24
CELL_SIZE = 14
CONTROL_HEIGHT = 66
STEP_DELAY_MILLISECONDS = 120
WINDOW_WIDTH = GRID_WIDTH * CELL_SIZE
WINDOW_HEIGHT = GRID_HEIGHT * CELL_SIZE + CONTROL_HEIGHT

BACKGROUND_COLOR = "#f6f8fa"
GRID_COLOR = "#d0d7de"
LIVE_CELL_COLOR = "#1f6feb"
TEXT_COLOR = "#24292f"
BUTTON_COLOR = "#eaeef2"
BUTTON_HOVER_COLOR = "#d8dee4"

NEIGHBOR_OFFSETS = [
    (x_offset, y_offset)
    for y_offset in (-1, 0, 1)
    for x_offset in (-1, 0, 1)
    if (x_offset, y_offset) != (0, 0)
]


def next_generation(live_cells, width=GRID_WIDTH, height=GRID_HEIGHT):
    """Apply Conway's rules on a grid whose edges wrap around."""
    # Modulo arithmetic makes opposite edges touch, forming a toroidal world.
    neighbor_counts = Counter(
        ((x + x_offset) % width, (y + y_offset) % height)
        for x, y in live_cells
        for x_offset, y_offset in NEIGHBOR_OFFSETS
    )

    return {
        cell
        for cell, live_neighbors in neighbor_counts.items()
        if live_neighbors == 3 or (live_neighbors == 2 and cell in live_cells)
    }


class GameOfLifeWindow:
    def __init__(self):
        # The grid occupies the top of one compact, fixed-size drawing surface.
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption("Conway's Game of Life")

        self.clock = pygame.time.Clock()
        self.font = pygame.font.Font(None, 22)
        self.live_cells = set()
        self.generation = 0
        self.running = False
        self.last_step_time = 0
        self.random_generator = random.Random()

        # Pygame draws controls itself, so each button is just a labeled rectangle.
        self.buttons = {
            "start": pygame.Rect(8, GRID_HEIGHT * CELL_SIZE + 8, 76, 26),
            "step": pygame.Rect(90, GRID_HEIGHT * CELL_SIZE + 8, 58, 26),
            "randomize": pygame.Rect(154, GRID_HEIGHT * CELL_SIZE + 8, 98, 26),
            "clear": pygame.Rect(258, GRID_HEIGHT * CELL_SIZE + 8, 58, 26),
        }

        self.load_glider()

    def load_glider(self):
        # Seed a five-cell glider near the center so the first run is immediately useful.
        left = GRID_WIDTH // 2 - 1
        top = GRID_HEIGHT // 2 - 1
        self.live_cells = {
            (left + 1, top),
            (left + 2, top + 1),
            (left, top + 2),
            (left + 1, top + 2),
            (left + 2, top + 2),
        }
        self.generation = 0

    def step(self):
        self.live_cells = next_generation(self.live_cells)
        self.generation += 1

    def toggle_running(self):
        self.running = not self.running
        self.last_step_time = pygame.time.get_ticks()

    def randomize(self):
        self.running = False
        # A modest density usually produces visible activity without filling the board.
        self.live_cells = {
            (x, y)
            for y in range(GRID_HEIGHT)
            for x in range(GRID_WIDTH)
            if self.random_generator.random() < 0.22
        }
        self.generation = 0

    def clear(self):
        self.running = False
        self.live_cells.clear()
        self.generation = 0

    def handle_grid_click(self, position):
        # Convert window pixels into integer grid coordinates.
        x, y = position[0] // CELL_SIZE, position[1] // CELL_SIZE
        cell = (x, y)

        if cell in self.live_cells:
            self.live_cells.remove(cell)
        else:
            self.live_cells.add(cell)

    def handle_control_click(self, position):
        if self.buttons["start"].collidepoint(position):
            self.toggle_running()
        elif self.buttons["step"].collidepoint(position):
            self.step()
        elif self.buttons["randomize"].collidepoint(position):
            self.randomize()
        elif self.buttons["clear"].collidepoint(position):
            self.clear()

    def handle_event(self, event):
        if event.type == pygame.QUIT:
            return False

        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE:
                self.toggle_running()
            elif event.key == pygame.K_n:
                self.step()
            elif event.key == pygame.K_r:
                self.randomize()
            elif event.key == pygame.K_c:
                self.clear()

        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if event.pos[1] < GRID_HEIGHT * CELL_SIZE:
                self.handle_grid_click(event.pos)
            else:
                self.handle_control_click(event.pos)

        return True

    def update(self):
        current_time = pygame.time.get_ticks()

        # Time-based stepping keeps simulation speed independent of drawing frame rate.
        if self.running and current_time - self.last_step_time >= STEP_DELAY_MILLISECONDS:
            self.step()
            self.last_step_time = current_time

    def draw_grid(self):
        self.screen.fill(BACKGROUND_COLOR)

        # Repainting this small grid each frame keeps the rendering logic straightforward.
        for y in range(GRID_HEIGHT):
            for x in range(GRID_WIDTH):
                rectangle = pygame.Rect(
                    x * CELL_SIZE,
                    y * CELL_SIZE,
                    CELL_SIZE,
                    CELL_SIZE,
                )
                color = LIVE_CELL_COLOR if (x, y) in self.live_cells else BACKGROUND_COLOR
                pygame.draw.rect(self.screen, color, rectangle)
                pygame.draw.rect(self.screen, GRID_COLOR, rectangle, width=1)

    def draw_button(self, name, label, mouse_position):
        rectangle = self.buttons[name]
        color = BUTTON_HOVER_COLOR if rectangle.collidepoint(mouse_position) else BUTTON_COLOR
        pygame.draw.rect(self.screen, color, rectangle, border_radius=4)
        pygame.draw.rect(self.screen, GRID_COLOR, rectangle, width=1, border_radius=4)

        text = self.font.render(label, True, TEXT_COLOR)
        self.screen.blit(text, text.get_rect(center=rectangle.center))

    def draw(self):
        self.draw_grid()
        mouse_position = pygame.mouse.get_pos()
        start_label = "Pause" if self.running else "Start"
        self.draw_button("start", start_label, mouse_position)
        self.draw_button("step", "Step", mouse_position)
        self.draw_button("randomize", "Randomize", mouse_position)
        self.draw_button("clear", "Clear", mouse_position)

        status = self.font.render(
            f"Generation: {self.generation}   Population: {len(self.live_cells)}",
            True,
            TEXT_COLOR,
        )
        self.screen.blit(status, (8, GRID_HEIGHT * CELL_SIZE + 42))
        pygame.display.flip()

    def run(self):
        active = True

        # Process input, update simulation state, then redraw at most 60 times per second.
        while active:
            for event in pygame.event.get():
                active = self.handle_event(event)
                if not active:
                    break

            self.update()
            self.draw()
            self.clock.tick(60)


def main():
    pygame.init()

    try:
        GameOfLifeWindow().run()
    finally:
        pygame.quit()


if __name__ == "__main__":
    main()
