# Project: AI-Assisted Job Researcher

## Overview

This project is a Next.js application that helps job seekers find the most relevant job postings. It takes a user's resume (in PDF format) or a portfolio URL, uses AI to create a structured profile of the candidate, scapes job boards for listings, and then uses another AI model to rank the jobs based on how well they match the candidate's profile.

## Architecture

The application is built with a React frontend and a Next.js backend. The core logic is in the `lib/` directory, and the API endpoints are in `app/api/`.

The main workflow is as follows:
1.  **Input:** The user uploads a resume or provides a portfolio URL.
2.  **Candidate Profiling:** The backend extracts text from the input and uses an AI model to generate a `CandidateProfile`. This logic is in `lib/candidate.ts`.
3.  **Job Scraping:** The application scrapes job postings from the web using the Hyperbrowser SDK. The scraping logic is in `lib/jobs.ts`. Currently, it only scrapes "Work at a Startup".
4.  **Matching:** The candidate profile and job listings are sent to an AI model to be scored and ranked. The matching logic is in `lib/match.ts`.
5.  **Output:** The ranked list of jobs is displayed to the user.

## Key Files

*   `lib/jobs.ts`: Contains the job scraping and parsing logic. This is where new job sources need to be added.
*   `app/api/analyze/resume/route.ts`: The main API endpoint that orchestrates the entire process.
*   `lib/ai-provider.ts`: An abstraction layer for using different AI providers (OpenAI, Claude, Google).
*   `lib/match.ts`: Contains the AI-powered logic for matching jobs to candidates.
*   `lib/candidate.ts`: Contains the AI-powered logic for creating a candidate profile.
*   `README.md`: The main project README with setup instructions.

## How to Extend

To add more job sources, you need to:

1.  **Add a new `JobSource` to the `JOB_SOURCES` array in `lib/jobs.ts`.**
    *   Specify the `url`, `name`, and `depth`.
    *   Set the `type` to either `'scrape'` (default) or `'api'`.

2.  **Implement the fetching/parsing logic:**
    *   **For `'scrape'` sources:** Update the `extractJobsFromHTML` function in `lib/jobs.ts` to parse the HTML of the new job source. This will likely require custom regular expressions or selectors.
    *   **For `'api'` sources:** Update the `fetchFromApi` function in `lib/jobs.ts` to call a new specific fetch function (e.g., `fetchNewSourceJobs`) that handles the API request and response mapping.
