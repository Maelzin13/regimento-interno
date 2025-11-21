# Regimento Interno Comentado

Aplicativo mobile e web para consulta e navegação do Regimento Interno da Câmara dos Deputados. Oferece uma experiência digital completa para estudo e consulta do regimento interno com funcionalidades avançadas de busca, navegação e visualização.

## 📱 Sobre o Projeto

Este projeto é uma aplicação híbrida desenvolvida com Ionic e Angular que permite aos usuários consultar o Regimento Interno da Câmara dos Deputados de forma digital, acessível em dispositivos móveis (iOS/Android) e navegadores web.

### Principais Funcionalidades

- ✅ **Consulta Digital**: Acesso completo ao regimento interno em formato digital
- ✅ **Navegação Inteligente**: Sistema de remissões clicáveis que conectam artigos relacionados
- ✅ **Busca Avançada**: Sistema de busca em tempo real com highlight de resultados
- ✅ **Visualização de PDFs**: Acesso a resumos temáticos e esquemas em PDF
- ✅ **Autenticação Social**: Login com Google, Apple ou email/senha
- ✅ **Sistema de Assinatura**: Planos mensais e anuais com integração Stripe
- ✅ **Histórico de Navegação**: Sistema que preserva o histórico de navegação entre artigos
- ✅ **Interface Responsiva**: Design adaptado para mobile e web

## 🛠️ Tecnologias Utilizadas

### Core
- **Ionic 8.7.5** - Framework para desenvolvimento de aplicações móveis híbridas
- **Angular 18.0.0** - Framework front-end para desenvolvimento de aplicações web
- **TypeScript 5.4.0** - Linguagem de programação com tipagem estática
- **Capacitor 7.4.3** - Plataforma para construção de aplicações nativas

### Autenticação e Backend
- **Firebase 11.2.0** - Autenticação social (Google e Apple)
- **@angular/fire 18.0.1** - Integração Angular com Firebase
- **Axios 1.7.8** - Cliente HTTP para comunicação com API

### UI/UX
- **SCSS** - Pré-processador CSS
- **Bootstrap 5.3.3** - Framework CSS
- **Ionicons 7.0.0** - Biblioteca de ícones

### Funcionalidades Específicas
- **ng2-pdf-viewer 10.4.0** - Visualizador de PDF
- **@capacitor-firebase/authentication 7.1.0** - Plugin de autenticação Firebase
- **@capacitor-community/apple-sign-in 7.0.1** - Sign in with Apple
- **@ionic/storage-angular 4.0.0** - Armazenamento local
- **RxJS 7.8.0** - Programação reativa

### Pagamentos
- **Stripe** - Sistema de pagamento (integração via API)

## 🚀 Como Executar

### Pré-requisitos

- Node.js (versão recomendada: 18.x ou superior)
- npm ou yarn
- Ionic CLI: `npm install -g @ionic/cli`
- Angular CLI: `npm install -g @angular/cli`

### Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd regimento-interno
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
   - Edite `src/environments/environment.ts` com as configurações da API
   - Configure as chaves do Firebase e Stripe conforme necessário

4. Execute o projeto:
```bash
# Para desenvolvimento web
npm start

# Ou usando Ionic CLI
ionic serve
```

### Build para Produção

```bash
# Build web
npm run build

# Build Android
npm run build:android

# Build iOS
npm run build:ios
```

## 📁 Estrutura do Projeto

```
regimento-interno/
├── src/
│   ├── app/
│   │   ├── components/          # Componentes reutilizáveis
│   │   │   └── pdf-viewer/      # Visualizador de PDF
│   │   ├── guards/              # Guards de rota (AuthGuard)
│   │   ├── interceptors/        # Interceptors HTTP
│   │   ├── Modals/              # Componentes modais
│   │   │   ├── descricao-modal/
│   │   │   └── regimento-modal/
│   │   ├── models/              # Modelos de dados
│   │   ├── pages/               # Páginas da aplicação
│   │   │   ├── home/            # Página inicial
│   │   │   ├── view-text/       # Visualização completa
│   │   │   ├── view-text-limit/ # Visualização limitada
│   │   │   ├── login/           # Login
│   │   │   ├── cadastro/        # Cadastro
│   │   │   ├── dashboard/       # Dashboard
│   │   │   └── ...
│   │   ├── pipes/               # Pipes customizados
│   │   └── services/            # Serviços Angular
│   │       ├── api.service.ts
│   │       ├── auth.service.ts
│   │       ├── book.service.ts
│   │       └── ...
│   ├── assets/                  # Recursos estáticos
│   ├── environments/            # Configurações de ambiente
│   └── theme/                   # Tema e variáveis SCSS
├── android/                     # Projeto Android nativo
├── ios/                         # Projeto iOS nativo
├── jarvis_docs/                 # Documentação do projeto
└── www/                         # Build de produção
```

## 🏗️ Arquitetura

### Padrões Utilizados

- **Módulos Angular com Lazy Loading**: Rotas carregadas sob demanda
- **Component-Based Architecture**: Componentes reutilizáveis e modulares
- **Service Layer Pattern**: Lógica de negócios isolada em serviços
- **Repository Pattern**: Serviços atuam como repositórios para dados da API

### Estrutura de Dados

O conteúdo do regimento é organizado hierarquicamente:

- **Livro (Book)** → **Títulos** → **Capítulos** → **Seções** → **Artigos** → **Parágrafos**
  - Cada artigo pode conter:
    - **Remissões**: Links para outros artigos/parágrafos
    - **Comentários**: Anotações explicativas

## 🔐 Autenticação

O aplicativo suporta múltiplos métodos de autenticação:

- **Login Tradicional**: Email e senha
- **Google OAuth**: Autenticação via Google
- **Apple Sign In**: Autenticação via Apple (iOS)

O sistema utiliza JWT tokens para autenticação e protege rotas com `AuthGuard`.

## 💳 Sistema de Assinatura

- **Planos Disponíveis**: Mensal e Anual
- **Integração Stripe**: 
  - iOS: Fluxo web via Browser (conformidade App Store)
  - Android: Fluxo nativo via Stripe PaymentSheet
  - Web: Stripe Checkout
- **Portal de Faturamento**: Gerenciamento de assinaturas e métodos de pagamento
- **Regras de Migração**: Mensal → Anual permitido, Anual → Mensal bloqueado

## 🔍 Funcionalidades de Busca

- Busca em tempo real no conteúdo
- Highlight de resultados
- Navegação entre resultados
- Histórico de buscas
- Busca em artigos, parágrafos, comentários e remissões

## 📱 Plataformas Suportadas

- **Web**: Progressive Web App (PWA)
- **iOS**: Aplicativo nativo via Capacitor
- **Android**: Aplicativo nativo via Capacitor

## 🌐 API

A aplicação consome uma API REST localizada em:
- **Produção**: `https://regimentocd.com.br/api`

### Principais Endpoints

- `/login` - Autenticação
- `/books` - Livros e conteúdo
- `/books/{id}/sumario` - Sumário
- `/plans` - Planos de assinatura
- `/checkout` - Iniciar checkout
- `/portal` - Portal de faturamento

## 📝 Scripts Disponíveis

```bash
npm start              # Inicia servidor de desenvolvimento
npm run build          # Build para produção
npm run build:android  # Build para Android
npm run build:ios      # Build para iOS
npm test               # Executa testes
npm run lint           # Verifica código
npm run lint:fix       # Corrige problemas de lint
```

## 🔧 Configurações Importantes

### Capacitor Config
- **App ID**: `com.regimento.app`
- **App Name**: `Regimento Interno Comentado`
- **iOS Scheme**: `regimento`
- **Android Scheme**: `com.regimento.app`

### Firebase Config
- **Project ID**: `regimento-interno-comentado`

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👤 Autor

**Ismael Dos Santos Dias**

## 🗂️ Documentação Adicional

Para mais detalhes sobre o projeto, consulte a documentação completa em `jarvis_docs/`:

- `productContext.md` - Contexto do produto e funcionalidades
- `techContext.md` - Detalhes técnicos e tecnologias
- `systemPatterns.md` - Padrões arquiteturais
- `activeContext.md` - Estado atual do desenvolvimento
- `progress.md` - Progresso e status do projeto

## 🚧 Status do Projeto

### ✅ Funcionalidades Implementadas

- Autenticação completa (tradicional, Google, Apple)
- Visualização completa do regimento interno
- Sistema de navegação por remissões
- Busca avançada com highlight
- Visualização de PDFs
- Sistema de assinatura e pagamentos
- Portal de faturamento
- Histórico de navegação
- Interface responsiva

### 📋 Melhorias Futuras

- Histórico de navegação persistente
- Sistema de favoritos
- Anotações do usuário
- Compartilhamento de artigos
- Modo offline
- Notificações sobre atualizações
- Dashboard com estatísticas

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

---

Desenvolvido com ❤️ usando Ionic e Angular

