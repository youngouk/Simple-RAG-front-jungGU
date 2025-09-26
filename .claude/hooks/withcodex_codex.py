#!/usr/bin/env python3
import json
import os
import subprocess
import sys


def run(argv, stdin_text=None, timeout=120):
  return subprocess.run(
    argv,
    input=stdin_text,
    text=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    timeout=timeout,
    check=False,
  )


def main():
  try:
    data = json.load(sys.stdin)
  except Exception as exc:
    print(f"[withCodex] invalid hook input: {exc}", file=sys.stderr)
    sys.exit(1)

  prompt = data.get("prompt", "")
  if not os.getenv("CLAUDE_WITHCODEX"):
    sys.exit(0)

  codex_prompt = f"제공된 쿼리에 대해 분석한 결과를 제공해줘. 쿼리 내용 : {prompt}"
  argv = [
    "codex",
    "exec",
    "--model",
    "gpt-5-codex",
    "--sandbox",
    "read-only",
    codex_prompt,
  ]
  result = run(argv)
  if result.returncode != 0:
    err = (result.stderr or result.stdout or "").strip()
    codex_out = f"[Codex 오류] {err or f'codex exec exited with code {result.returncode}'}"
  else:
    codex_out = (result.stdout or "").strip()
    if not codex_out:
      codex_out = "[Codex] 출력 없음"

  out = {
    "hookSpecificOutput": {
      "hookEventName": "UserPromptSubmit",
      "additionalContext": f"[Codex 분석]\n{codex_out}",
    }
  }
  print(json.dumps(out))
  sys.exit(0)


if __name__ == "__main__":
  main()
