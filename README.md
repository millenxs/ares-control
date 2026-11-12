# Ares Control — Controle de Sondas em Marte

Aplicação full stack (API REST em **Python/FastAPI** e interface em **React/TypeScript**) para controlar o lançamento e a movimentação de sondas enviadas em missão a um planalto retangular em Marte, com interface de observatório espacial e telemetria em tempo real.

## Demonstração Online (Deploy na Vercel)

| Serviço | URL de Produção | Descrição |
|---|---|---|
| **Frontend (React + TypeScript)** | [https://frontend-theta-sand-20.vercel.app](https://frontend-theta-sand-20.vercel.app) | Console interativo do observatório, lançamento, comandos e malha SVG sobre Marte 3D |
| **Backend — Swagger UI (FastAPI)** | [https://ares-control.vercel.app/docs](https://ares-control.vercel.app/docs) | Documentação OpenAPI interativa dos 3 endpoints REST |
| **Backend — API Base URL** | [https://ares-control.vercel.app/api/v1/probes](https://ares-control.vercel.app/api/v1/probes) | Endpoint REST de listagem e lançamento de sondas |

---

## Sumário

1. [Sobre o Projeto](#1-sobre-o-projeto)
2. [Funcionalidades](#2-funcionalidades)
3. [Tecnologias e Versões](#3-tecnologias-e-versões)
4. [Arquitetura e Organização](#4-arquitetura-e-organização)
5. [Pré-requisitos](#5-pré-requisitos)
6. [Como Executar Localmente](#6-como-executar-localmente)
7. [Como Executar com Docker](#7-como-executar-com-docker)
8. [Como Executar os Testes e Qualidade](#8-como-executar-os-testes-e-qualidade)
9. [Contratos da API e Exemplos](#9-contratos-da-api-e-exemplos)
10. [Decisões de Implementação](#10-decisões-de-implementação)
11. [Limitações Conhecidas](#11-limitações-conhecidas)

---

## 1. Sobre o Projeto

O **Ares Control** resolve o desafio técnico da Sonda em Marte expondo três operações principais via API HTTP REST e uma interface gráfica interativa:

1. **Lançar sonda e configurar malha:** define o canto superior direito `(x, y)` da malha disponível para a sonda e sua direção inicial (`NORTH`, `EAST`, `SOUTH`, `WEST`), iniciando **sempre** na posição `(0, 0)`.
2. **Mover sonda:** recebe uma sequência de comandos (`M`, `L`, `R`), valida e executa a trajetória garantindo que a sonda **nunca** ultrapasse os limites do planalto.
3. **Listar sondas:** retorna o estado atual de todas as sondas lançadas.

---

## 2. Funcionalidades

- **Domínio puro e execução atômica:** toda sequência de comandos é validada e simulada passo a passo sobre um estado temporário. Se qualquer caractere for inválido ou se algum passo intermediário sair dos limites da malha, a operação inteira é rejeitada (`422`) e a sonda permanece intacta na posição e direção anteriores.
- **Interface de Observatório Cartográfico:**
  - Configuração dos limites máximos `(X, Y)` e bússola digital para escolha da direção inicial (`NORTH`, `EAST`, `SOUTH`, `WEST`).
  - Visualização da malha em SVG com origem `(0, 0)` no canto inferior esquerdo e Norte apontando para o topo, sobreposta ao globo 3D de Marte (com alternância entre perspectiva `3D` e `2D`).
  - **Buffer de Instruções triplo:** permite montar a sequência `M`, `L`, `R` digitando no campo, usando as teclas rápidas (`[L] ESQ`, `[M] MOVER`, `[R] DIR`) ou clicando diretamente em uma célula de destino na malha SVG.
  - **Rastro ortogonal** das células visitadas por cada sonda e **pré-visualização (dry-run)** da trajetória prevista ou do ponto de colisão na borda enquanto os comandos são digitados.
  - Histórico de transmissões por sonda e suporte a múltiplas sondas operando em malhas independentes.

---

## 3. Tecnologias e Versões

| Camada | Tecnologia | Versão / Faixa |
|---|---|---|
| **Linguagem Backend** | Python | `3.14.10` (`.python-version`, faixa `>=3.14,<3.15` em `pyproject.toml`) |
| **Gerenciador Python** | `uv` | Lockfile reproduzível em `uv.lock` |
| **Framework HTTP / Validação** | FastAPI + Pydantic v2 + Uvicorn | FastAPI `>=0.115`, Pydantic `>=2.10` |
| **Testes e Qualidade Backend** | Pytest + HTTPX + Ruff | 75 testes automatizados (domínio, aplicação e HTTP) |
| **Runtime Frontend** | Node.js | `24.22.2` LTS (`.nvmrc`, faixa `>=24.22.2 <25` em `package.json`) |
| **Interface Gráfica** | React 19 + TypeScript + Vite + Three.js | Lockfile reproduzível em `frontend/package-lock.json` |
| **Testes Frontend** | Vitest + Testing Library + jsdom | 13 testes automatizados (cliente HTTP, simulação e fluxos integrados) |

---

## 4. Arquitetura e Organização

O projeto segue **Arquitetura Limpa (Clean Architecture)**, **SOLID** e separação por features no frontend (**Bulletproof React**), com dependências apontando sempre para dentro:

```text
React (apresentação)
       │ HTTP/JSON
       ▼
FastAPI (adaptador de entrada HTTP)
       ▼
Aplicação (casos de uso e protocolo de repositório)
       ▼
Domínio (entidades imutáveis, objetos de valor e navegação pura)
       ▲
       │ implementa protocolo
Infraestrutura (repositório em memória e lock de sincronização)
```

### Estrutura do Repositório

```text
ares-control/
├── README.md
├── pyproject.toml                 # Dependências, empacotamento Setuptools e ferramentas Python
├── uv.lock                        # Lockfile reproduzível do Python
├── .python-version                # Pin da versão Python (3.14.10)
├── .nvmrc                         # Pin da versão Node.js (24.22.2)
├── .env.example                   # Exemplo de variáveis de ambiente
├── Dockerfile                     # Build multi-target (backend e frontend)
├── compose.yaml                   # Execução integrada via Docker Compose
├── backend/
│   ├── src/ares_control/
│   │   ├── domain.py              # Direction, Position, Plateau, Probe, Command e execute_commands
│   │   ├── application.py         # Casos de uso: LaunchProbe, ExecuteCommands e ListProbes
│   │   ├── repository.py          # Protocolo ProbeRepository e InMemoryProbeRepository
│   │   └── http/
│   │       ├── app.py             # Composition root, CORS, lock compartilhado e handlers de erro
│   │       ├── routes.py          # Endpoints REST em /api/v1
│   │       └── schemas.py         # Schemas Pydantic estritos (StrictInt, StrictStr)
│   └── tests/
│       ├── test_domain.py         # Testes unitários das regras puras de domínio
│       ├── test_application.py    # Testes dos casos de uso, repositório e concorrência
│       └── test_http.py           # Testes de integração HTTP e contratos de erro
└── frontend/
    ├── package.json
    ├── package-lock.json
    ├── vite.config.ts
    ├── src/
    │   ├── app/                   # Composição principal (App.tsx, main.tsx)
    │   ├── features/mission/      # Hook useMissionControl, PlateauMap SVG, MarsCanvas3D e preview
    │   ├── features/probes/       # LaunchProbeForm, ProbeList e CommandDeck
    │   ├── shared/api/            # Cliente HTTP tipado (probesApi.ts)
    │   ├── shared/ui/             # Componentes visuais base (Primitives.tsx)
    │   └── styles/                # Design tokens (tokens.css) e estilos (global.css)
    └── tests/                     # Testes unitários e integrados da interface
```

---

## 5. Pré-requisitos

- **Python `3.14.10`** e **[`uv`](https://docs.astral.sh/uv/)** instalados (o próprio `uv sync` baixa automaticamente o interpretador `3.14.10` caso ainda não esteja presente na máquina).
- **Node.js `24.22.2` LTS** (ou compatível) e **`npm`**.
- **Docker** e **Docker Compose** *(opcional, caso prefira rodar em containers)*.

---

## 6. Como Executar Localmente

### 6.1. Configurar e iniciar o Backend (API Python)

Na raiz do repositório:

```bash
# Instala o interpretador Python, as dependências travadas e o pacote ares_control
uv sync

# Inicia o servidor FastAPI em http://127.0.0.1:8000 (com 1 worker para preservar o estado em memória)
uv run uvicorn ares_control.http.app:app --reload --port 8000
```

- **URL base da API:** `http://localhost:8000`
- **Documentação interativa (Swagger / OpenAPI):** `http://localhost:8000/docs`

### 6.2. Configurar e iniciar o Frontend (React)

Em outro terminal:

```bash
cd frontend

# Instala as dependências exatamente conforme o package-lock.json
npm ci

# Inicia o servidor de desenvolvimento em http://localhost:5173
npm run dev
```

Acesse **`http://localhost:5173`** no navegador.

> **Variáveis de ambiente opcionais (`.env.example`):**
> - `ARES_CORS_ORIGINS=http://localhost:5173` (origens permitidas pelo CORS no backend, separadas por vírgula)
> - `VITE_API_BASE_URL=http://localhost:8000` (URL base consumida pelo frontend)

---

## 7. Como Executar com Docker

Para subir o backend (`http://localhost:8000`) e o frontend (`http://localhost:5173`) juntos com um único comando:

```bash
docker compose up --build
```

---

## 8. Como Executar os Testes e Qualidade

### Backend (Pytest + Ruff)

Na raiz do repositório:

```bash
# Executar todos os 75 testes (domínio, aplicação e integração HTTP)
uv run pytest -v

# Verificar lint e formatação
uv run ruff check .
uv run ruff format --check .
```

### Frontend (Vitest + TypeScript + Build)

Dentro da pasta `frontend`:

```bash
cd frontend

# Executar os 13 testes automatizados
npm test

# Validar tipagem TypeScript e gerar build de produção
npm run build
```

### Pipeline de CI/CD e Fluxo de Entrega

- **GitHub Actions (`.github/workflows/ci.yml`):** configurado com dois jobs independentes em `push` e `pull_request` para a branch `main`:
  - **`Backend (Ruff & Pytest)`:** instala o `uv`, sincroniza dependências travadas (`uv sync --locked`), valida lint/formatação (`ruff check` e `ruff format --check`) e executa a suíte de 75 testes (`pytest -v`).
  - **`Frontend (Vitest & Build)`:** configura o Node.js via `.nvmrc`, instala dependências (`npm ci`), executa os 13 testes automatizados (`npm test`) e valida o bundle de produção (`npm run build`).
- **Fluxo Git e Proteção de Branch:** desenvolvimento organizado em branches temáticas e Pull Requests, com verificação de status obrigatória (`Backend (Ruff & Pytest)`) antes do merge na `main`.
- **Deploy Contínuo (Vercel):**
  - **API Python/FastAPI:** publicada na Vercel utilizando o runtime Python `3.14` (`.python-version`) e entrypoint declarado em `[tool.vercel]` no `pyproject.toml`.
  - **Interface React/Vite:** publicada na Vercel a partir do diretório `frontend/` e integrada diretamente à API de produção.

---

## 9. Contratos da API e Exemplos

Todos os endpoints utilizam o prefixo `/api/v1`.

### 9.1. Lançar Sonda e Configurar Malha — `POST /api/v1/probes`

Lança uma nova sonda sempre na coordenada inicial `(0, 0)` e define os limites máximos inclusivos `(x, y)` da sua malha.

**Requisição:**
```bash
curl -X POST "http://localhost:8000/api/v1/probes" \
  -H "Content-Type: application/json" \
  -d '{
    "x": 5,
    "y": 5,
    "direction": "NORTH"
  }'
```

**Resposta (`201 Created`):**
```json
{
  "id": "6d2e6032-ae03-48e3-a527-3bb88608e35c",
  "x": 0,
  "y": 0,
  "direction": "NORTH",
  "plateau": {
    "max_x": 5,
    "max_y": 5
  }
}
```

### 9.2. Mover Sonda — `POST /api/v1/probes/{probe_id}/commands`

Executa uma sequência de comandos (`M`, `L`, `R`) para a sonda informada:
- `M`: avança 1 posição na direção atual.
- `L`: rotaciona $90^\circ$ para a esquerda sem mudar de coordenada.
- `R`: rotaciona $90^\circ$ para a direita sem mudar de coordenada.

**Requisição:**
```bash
curl -X POST "http://localhost:8000/api/v1/probes/6d2e6032-ae03-48e3-a527-3bb88608e35c/commands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": "MRM"
  }'
```

**Resposta (`200 OK`):**
```json
{
  "id": "6d2e6032-ae03-48e3-a527-3bb88608e35c",
  "x": 1,
  "y": 1,
  "direction": "EAST",
  "plateau": {
    "max_x": 5,
    "max_y": 5
  }
}
```

### 9.3. Listar Posição das Sondas — `GET /api/v1/probes`

Retorna o estado atual de todas as sondas enviadas.

**Requisição:**
```bash
curl "http://localhost:8000/api/v1/probes"
```

**Resposta (`200 OK`):**
```json
{
  "probes": [
    {
      "id": "6d2e6032-ae03-48e3-a527-3bb88608e35c",
      "x": 1,
      "y": 1,
      "direction": "EAST",
      "plateau": {
        "max_x": 5,
        "max_y": 5
      }
    }
  ]
}
```

### 9.4. Tratamento de Erros (Envelope Padronizado)

Tanto erros de validação de payload (`RequestValidationError`) quanto violações de regras de negócio (`DomainError`) retornam um envelope JSON consistente:

- **`422 Unprocessable Content` (Movimento fora dos limites — estado original preservado):**
  ```json
  {
    "error": {
      "code": "out_of_bounds",
      "message": "Command at index 5 moves probe to (0, 6), outside plateau (5, 5).",
      "details": {
        "index": 5,
        "x": 0,
        "y": 6,
        "max_x": 5,
        "max_y": 5
      }
    }
  }
  ```
- **`422 Unprocessable Content` (Comando desconhecido — índice base zero):**
  ```json
  {
    "error": {
      "code": "invalid_command",
      "message": "Invalid command 'X' at index 1. Expected M, L, or R.",
      "details": {
        "index": 1,
        "command": "X"
      }
    }
  }
  ```
- **`404 Not Found` (Sonda inexistente):**
  ```json
  {
    "error": {
      "code": "probe_not_found",
      "message": "Probe 'non-existent' was not found.",
      "details": {
        "id": "non-existent"
      }
    }
  }
  ```

---

## 10. Decisões de Implementação

1. **Malha independente por sonda e metadados `plateau`:**
   Como o endpoint de lançamento recebe `x`, `y` e `direction` a cada chamada e o enunciado não impõe uma malha global única, cada sonda mantém os limites recebidos no seu lançamento (`0..max_x` e `0..max_y` inclusivos). As respostas incluem o objeto `"plateau": { "max_x", "max_y" }` além de `id`, `x`, `y` e `direction`, permitindo que a interface reconstrua fielmente a malha de cada sonda mesmo após recarregar a página.
2. **Execução atômica de comandos:**
   Se uma sequência possuir qualquer caractere inválido (incluindo minúsculas, espaços ou string vazia) ou se qualquer movimento intermediário tentar sair dos limites da malha, a sequência inteira é rejeitada e nenhuma alteração parcial é salva.
3. **Validação estrita de tipos:**
   Os schemas de entrada usam `StrictInt` e `StrictStr` do Pydantic v2, e o domínio também valida `type(value) is int and value >= 0`, rejeitando coerções silenciosas como strings numéricas (`"5"`) ou booleanos (`true`/`false`, já que `bool` é subclasse de `int` em Python).
4. **Sincronização concorrente em processo:**
   O composition root (`create_app`) instancia o repositório em memória e um único `threading.Lock` compartilhado durante toda a vida da aplicação, protegendo o ciclo completo de leitura, simulação e atualização em requisições concorrentes sobre uma mesma sonda.
5. **Sobreposição de sondas permitida:**
   Como todas as sondas iniciam obrigatoriamente em `(0, 0)` e o desafio não especifica regras de colisão entre sondas, múltiplas sondas podem ocupar a mesma coordenada.

---

## 11. Limitações Conhecidas

- **Armazenamento em memória volátil:** os dados das sondas residem no `InMemoryProbeRepository` (isolado atrás do protocolo `ProbeRepository`) e são reiniciados quando o processo da API é encerrado.
- **Execução em processo único (`--workers 1`):** enquanto o armazenamento for em memória, o servidor Uvicorn deve ser executado com um único worker, pois processos separados do sistema operacional não compartilham memória nem o `threading.Lock` em processo.
