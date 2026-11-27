"""Extrai os três planos completos do GIF arquivado do post, sem recodificação."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "media/99f1a407-fernandinho_paulinho_v3_dyn.gif"
NAMES = ["paulinho", "fernandinho", "ambos"]


def after_blocks(data, pos):
    while data[pos]:
        pos += 1 + data[pos]
    return pos + 1


def frames(data):
    if data[:6] not in (b"GIF89a", b"GIF87a"):
        raise ValueError("Formato inesperado")
    pos = 13 + (3 * (2 << (data[10] & 7)) if data[10] & 128 else 0)
    header = data[:pos]
    control = b""
    while pos < len(data):
        start = pos
        marker = data[pos]
        pos += 1
        if marker == 0x3B:
            return
        if marker == 0x21:
            kind = data[pos]
            pos = after_blocks(data, pos + 1)
            if kind == 0xF9:
                control = data[start:pos]
            continue
        if marker != 0x2C:
            raise ValueError("Bloco GIF inválido")
        if data[pos:pos + 4] != bytes(4) or data[pos+4:pos+8] != data[6:10]:
            raise ValueError("Este extrator exige planos integrais independentes")
        flags = data[pos + 8]
        pos += 9
        if flags & 128:
            pos += 3 * (2 << (flags & 7))
        pos = after_blocks(data, pos + 1)
        yield header + control + data[start:pos] + b"\x3b"
        control = b""


if __name__ == "__main__":
    recovered = list(frames(SOURCE.read_bytes()))
    if len(recovered) != len(NAMES):
        raise ValueError("O GIF de 2014 contém três quadros")
    target = ROOT / "mapas"
    target.mkdir(exist_ok=True)
    for name, content in zip(NAMES, recovered):
        (target / (name + ".gif")).write_bytes(content)
