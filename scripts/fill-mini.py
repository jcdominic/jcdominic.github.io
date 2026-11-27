"""Find candidate 5×5 crossword fills offline. Review every candidate, write clues, then add it with scripts/build-minis.mjs."""
import argparse
import random
import re
from collections import defaultdict

# Orientations are varied as well, so the opening entry can be 3, 4 or 5 letters.
CORNERS = ("0000", "1000", "1100", "1010", "1110", "1111", "2020", "2010", "2000")


def template(corners):
    grid = [["."] * 5 for _ in range(5)]
    for corner, size in enumerate(map(int, corners)):
        for offset in range(size):
            row, col = 0, offset
            for _ in range(corner):
                row, col = col, 4 - row
            grid[row][col] = "#"
    return grid


def entries(grid):
    slots = []
    for down in (False, True):
        for line in range(5):
            slot = []
            for pos in range(5):
                row, col = (pos, line) if down else (line, pos)
                if grid[row][col] != "#":
                    slot.append((row, col))
                elif slot:
                    slots.append(slot)
                    slot = []
            if slot:
                slots.append(slot)
    return slots


class Filler:
    def __init__(self, words, rng):
        self.rng = rng
        self.words = sorted(set(words))
        self.ids = {word: i for i, word in enumerate(self.words)}
        self.length = defaultdict(int)
        self.letter = defaultdict(int)
        for i, word in enumerate(self.words):
            bit = 1 << i
            self.length[len(word)] |= bit
            for pos, char in enumerate(word):
                self.letter[len(word), pos, char] |= bit

    def fill(self, grid, anchor=None, excluded=(), limit=1500):
        slots = entries(grid)
        if any(len(slot) < 3 for slot in slots):
            return
        excluded_bits = sum(1 << self.ids[w] for w in set(excluded) if w in self.ids)
        domains = []
        at = defaultdict(list)
        for i, slot in enumerate(slots):
            domain = self.length[len(slot)] & ~excluded_bits
            for pos, cell in enumerate(slot):
                at[cell].append((i, pos))
                r, c = cell
                if grid[r][c] != ".":
                    domain &= self.letter[len(slot), pos, grid[r][c]]
            domains.append(domain)
        if anchor:
            if anchor not in self.ids:
                return
            bit = 1 << self.ids[anchor]
            fits = [i for i, domain in enumerate(domains) if domain & bit]
            if not fits:
                return
            domains[self.rng.choice(fits)] = bit

        neighbors = defaultdict(list)
        for (a, pos), (b, other) in at.values():
            neighbors[a].append((pos, b, other))
            neighbors[b].append((other, a, pos))

        def constrain(domains, changed):
            # Propagate letters in both directions before making a word choice.
            while changed:
                i = changed.pop()
                domain = domains[i]
                if not domain:
                    return False
                for pos, j, other in neighbors[i]:
                    compatible = 0
                    for char in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
                        if domain & self.letter[len(slots[i]), pos, char]:
                            compatible |= self.letter[len(slots[j]), other, char]
                    smaller = domains[j] & compatible
                    if smaller != domains[j]:
                        domains[j] = smaller
                        changed.add(j)
            return True

        def search(domains, changed):
            nonlocal limit
            limit -= 1
            if limit < 0 or not constrain(domains, changed):
                return
            choices = [(v.bit_count(), i) for i, v in enumerate(domains) if v.bit_count() > 1]
            if not choices:
                if len(set(domains)) != len(domains):
                    return
                for slot, bit in zip(slots, domains):
                    word = self.words[bit.bit_length() - 1]
                    for (r, c), char in zip(slot, word):
                        grid[r][c] = char
                return ["".join(row) for row in grid]
            _, i = min(choices)
            remaining = domains[i]
            bits = []
            while remaining:
                lowest = remaining & -remaining
                bits.append(lowest)
                remaining ^= lowest
            self.rng.shuffle(bits)
            for bit in bits:
                updated = [v & ~bit for v in domains]
                updated[i] = bit
                changed = {j for j, v in enumerate(updated) if domains[j] != v}
                result = search(updated, changed)
                if result or limit <= 0:
                    return result

        return search(domains, set(range(len(slots))))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("wordlist", help="one word per line, optionally WORD;SCORE")
    parser.add_argument("--min-score", type=int, default=50)
    parser.add_argument("--anchor", help="include a specific answer")
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--seed", type=int)
    args = parser.parse_args()
    words = set()
    with open(args.wordlist) as source:
        for line in source:
            word, _, score = line.strip().upper().partition(";")
            if re.fullmatch("[A-Z]{3,5}", word) and (not score or int(score) >= args.min_score):
                words.add(word)
    rng = random.Random(args.seed)
    filler = Filler(words, rng)
    found = set()
    for _ in range(args.count * 100):
        pattern = template(rng.choice(CORNERS))
        for _ in range(rng.randrange(4)):
            pattern = list(map(list, zip(*pattern[::-1])))
        grid = filler.fill(pattern, args.anchor and args.anchor.upper())
        if grid and tuple(grid) not in found:
            found.add(tuple(grid))
            print("/".join(grid))
            if len(found) == args.count:
                break
