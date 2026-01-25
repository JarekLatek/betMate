# betMate

[![Project Status: Active](https://img.shields.io/badge/status-active-success.svg)](https://github.com/JarekLatek/betMate)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A web application to simplify and enhance organizing informal sports betting among friends. betMate replaces manual, error-prone methods like spreadsheets with an automated and engaging system.

CI/CD test change

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

betMate is a web application designed to streamline the process of organizing casual sports bets among friends. The current version focuses on core functionalities, allowing users to register, place bets on match outcomes for selected tournaments (UEFA Champions League, World Cup 2026), and track their position on a public leaderboard. The primary goal is to automate the betting process, from collecting picks to calculating scores, providing a fun and seamless user experience.

## Tech Stack

### Frontend

- **Framework**: [Astro 5](https://astro.build/)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Component Library**: [Shadcn/ui](https://ui.shadcn.com/)

### Backend

- **Platform**: [Supabase](https://supabase.com/)
  - **Database**: PostgreSQL
  - **Authentication**: Supabase Auth
  - **Serverless Functions**: Supabase Edge Functions

### Testing

- **Unit Tests**: [Vitest](https://vitest.dev/)
- **E2E Tests**: [Playwright](https://playwright.dev/)
- **Component Testing**: [Testing Library](https://testing-library.com/)
- **Mocking**: [MSW](https://mswjs.io/)

### DevOps & Tooling

- **CI/CD**: [GitHub Actions](https://github.com/features/actions)
- **Hosting**: [DigitalOcean](https://www.digitalocean.com/) (via Docker)
- **Linting & Formatting**: [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)
- **Node Version Manager**: [nvm](https://github.com/nvm-sh/nvm)

## Getting Started Locally

### Prerequisites

- **Node.js**: Version `22.14.0` or higher. We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions.
- **npm**: Comes with Node.js.
- **Supabase Account**: You will need a Supabase project to handle the backend. You can create one for free at [supabase.com](https://supabase.com/).

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/JarekLatek/betMate.git
    cd betMate
    ```

2.  **Set up Node.js version:**
    If you are using `nvm`, run the following command to use the correct Node.js version:

    ```bash
    nvm use
    ```

3.  **Install dependencies:**

    ```bash
    npm install
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add your Supabase project URL and anon key:

    ```env
    PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
    PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    ```

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:4321`.

## Available Scripts

The following scripts are available in the `package.json`:

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run lint:fix`: Automatically fixes linting issues.
- `npm run format`: Formats the code using Prettier.
- `npm run test`: Runs unit tests with Vitest.
- `npm run test:watch`: Runs unit tests in watch mode.
- `npm run test:ui`: Opens Vitest UI for interactive testing.
- `npm run test:coverage`: Runs unit tests with coverage report.
- `npm run test:e2e`: Runs E2E tests with Playwright.
- `npm run test:e2e:ui`: Opens Playwright UI for interactive E2E testing.

## Project Scope

The MVP of betMate includes the following features:

- **User Authentication**: Secure user registration and login.
- **Match Betting**: Ability to bet on match outcomes (Win/Draw/Win) for the UEFA Champions League and World Cup 2026.
- **Bet Editing**: Users can edit their bets up to 5 minutes before a match begins.
- **Automatic Point Calculation**: A serverless function runs periodically to calculate points (1 point per correct prediction).
- **Public Leaderboard**: A ranking of all users based on points earned for each tournament.
- **Tournament Switching**: Easily switch between tournament views and their respective leaderboards.

## Project Status

This project is currently **in active development**. The MVP is the primary focus, with more features planned for future releases.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

MIT
