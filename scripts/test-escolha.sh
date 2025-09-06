#!/usr/bin/env bash
# Script interativo para capturar nome de usuário e escolher números de uma lista.
# Compatível com execução via termdeck (stdin/out simples) e evita dependências externas.
# Uso:
#   ./scripts/test-escolha.sh          # lista padrão 1..10
#   ./scripts/test-escolha.sh "10 20 30 40"   # lista custom
# Também pode forçar bash mesmo que o shell principal seja zsh.
set -euo pipefail

# Se alguém executar este arquivo dentro de outro shell sem bash, re-executa em bash.
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi

NUMS_INPUT="${1:-}"
if [[ -z "$NUMS_INPUT" ]]; then
  NUMS_INPUT="1 2 3 4 5 6 7 8 9 10"
fi

# Converte lista em array bash de forma segura
IFS=' ' read -r -a NUMS <<< "$NUMS_INPUT"

DEFAULT_NAME="${USER:-usuario}"
read -rp "Digite seu nome (${DEFAULT_NAME}): " NAME || NAME=""
NAME="${NAME:-$DEFAULT_NAME}"

echo
printf 'Lista disponível: %s\n' "${NUMS[*]}"
echo "Digite os números desejados separados por vírgula (ex: 2,5,9)." 
read -rp "Escolhas: " RAW_CHOICES || RAW_CHOICES=""

# Limpa caracteres inesperados mantendo dígitos, vírgulas e espaço
CLEAN_CHOICES="$(printf '%s' "$RAW_CHOICES" | tr -cd '0-9, ')"

# Quebra em picks
IFS=',' read -r -a PICKS <<< "$CLEAN_CHOICES"

FINAL=()
for PICK in "${PICKS[@]}"; do
  P_TRIM="$(echo "$PICK" | xargs 2>/dev/null || true)"
  [[ -z "$P_TRIM" ]] && continue
  for N in "${NUMS[@]}"; do
    if [[ "$P_TRIM" == "$N" ]]; then
      FINAL+=("$N")
      break
    fi
  done
done

echo
echo "--------------------------------"
echo "Usuário: $NAME"
if [[ ${#FINAL[@]} -gt 0 ]]; then
  echo "Números escolhidos: ${FINAL[*]}"
else
  echo "Nenhum número válido escolhido."
fi
echo "--------------------------------"
