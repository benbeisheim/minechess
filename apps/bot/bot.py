import maia
import random
from fastapi import HTTPException
from mine import select_mine

def get_move(fen: str, difficulty: int):
    if difficulty == 0:
        elo = 1100
    elif difficulty == 1:
        elo = 1400
    elif difficulty == 2:
        elo = 1800
    else:
        raise HTTPException(status_code=400, detail="difficulty must be in range 0-2")

    maia_move_dist, _ = maia.get_move_probs(fen, elo, elo)
    bomb_risk_adjusted_move_dist = deprioritize_bomb_risks(maia_move_dist, fen, difficulty)
    #perhaps move dist renormalization should occur here instead of in select_move_from_dist...?
    move = select_move_from_dist(bomb_risk_adjusted_move_dist)
    mine = select_mine(fen, move)
    return {"move": move, "mine": mine}

def deprioritize_bomb_risks(move_dist: dict, fen: str, diff: int) -> dict:
    king_pos = get_king_pos_self(fen)
    if diff == 0:
        return move_dist
    elif diff == 1:
        return deprioritize_bomb_risks_medium(move_dist, fen, king_pos)
    else:
        return deprioritize_bomb_risks_hard(move_dist, fen, king_pos)


def get_king_pos_self(fen: str):
    is_white = fen.split()[1] == "w"
    return get_king_pos(fen, is_white, True)

def get_king_pos_oppo(fen: str):
    is_white = fen.split()[1] == "w"
    return get_king_pos(fen, is_white, False)

def get_king_pos(fen: str, is_white: bool, is_self: bool) -> tuple:
    king = "K"
    if (is_self and not is_white) or (not is_self and is_white):
        king = "k"

    board = fen.split()[0]
    rows = board.split("/")
    for i, row in enumerate(rows):
        if king in row:
            col = 0
            for char in row:
                if char == king:
                    return (i, col)
                elif char.isnumeric():
                    col+= int(char)
                else:
                    col+=1

def deprioritize_bomb_risks_medium(move_dist: dict, fen: str, king_pos: int) -> dict:
    adjusted_move_dist = move_dist.copy()
    for move in move_dist.keys():
        origin, dest = move[:2], move[2:]

        origin_pos = get_pos_from_square(origin)
        dest_pos = get_pos_from_square(dest)
        origin_piece = check_piece_on_square(origin_pos, fen)

        if origin_piece.lower() != "p" and not is_protected_by_king(dest_pos, king_pos) and not is_capture(dest_pos, fen):
            #if piece is bomb-able, unless move is to king protexted square, halve prio
            adjusted_move_dist[move]/=2
        else:
            #for pawn moves and moves to protected square + king moves/captures, double prio
            adjusted_move_dist[move]*=2

    return adjusted_move_dist


def deprioritize_bomb_risks_hard(move_dist: dict, fen: str, king_pos: int) -> dict:
    #make it pure just in case matters later for some reason...
    adjusted_move_dist = move_dist.copy()
    for move in move_dist.keys():
        origin, dest = move[:2], move[2:]

        origin_pos = get_pos_from_square(origin)
        dest_pos = get_pos_from_square(dest)
        origin_piece = check_piece_on_square(origin_pos, fen)

        if origin_piece.lower() != "p" and not is_protected_by_king(origin_pos, king_pos) and not is_capture(dest_pos, fen):
            #if piece is bomb-able, unless move is to king protexted square, divide prio by 4
            adjusted_move_dist[move]/=4
        else:
            #for pawn moves and moves to protected square + king moves/captures, multiply prio by 4
            adjusted_move_dist[move]*=4

    return adjusted_move_dist


def is_protected_by_king(pos: tuple, king_pos: tuple) -> bool:
    y, x = pos
    ky, kx = king_pos
    return max(abs(kx-x), abs(ky-y)) == 1

def check_piece_on_square(pos: tuple, fen: str):
    #returns empty string for unoccupied square
    y, x = pos
    board = fen.split()[0]
    rows = board.split("/")
    row = rows[y]
    col = 0
    for char in row:
        if col > x:
            return ""
        elif col == x:
            return char if not char.isnumeric() else ""
        else:
            if char.isnumeric():
                col += int(char)
            else:
                col+=1
    return ""
        
        

    

def get_pos_from_square(square: str) -> tuple:
    return (8-int(square[1]), ord(square[0]) - ord("a"))

def select_move_from_dist(move_dist: dict):
    normalized_move_dist = renormalize_dist(move_dist)

    selection = random.random()
    cumm_prob = 0
    for move, prob in normalized_move_dist.items():
        cumm_prob += prob
        if cumm_prob >= selection:
            return move
    
    return list(move_dist.keys())[-1]
    

def renormalize_dist(move_dist: dict):
    normalized_dist = {}

    renorm_factor = 1/sum(move_dist.values())

    for k in move_dist:
        normalized_dist[k] = move_dist[k] * renorm_factor
    
    return normalized_dist


def is_capture(dest_pos: tuple, fen: str):
    return bool(check_piece_on_square(dest_pos, fen))