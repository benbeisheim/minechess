from maia2 import model, inference

_model = None
_prepared = None

def initialize():
    global _model, _prepared
    _model = model.from_pretrained(type="rapid", device="cpu")
    _prepared = inference.prepare()

def get_move_probs(fen, elo_self, elo_oppo):
    return inference.inference_each(_model, _prepared, fen, elo_self, elo_oppo)