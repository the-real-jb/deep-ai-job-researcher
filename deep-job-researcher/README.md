# Deep Job Researcher

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

Next.js app that matches your resume or portfolio with live job postings using AI-powered web scraping and intelligent matching.

## Features

- **Resume Analysis**: Upload PDF resumes and extract candidate profiles
- **Portfolio Scraping**: Live scraping of portfolio websites using Hyperbrowser
- **Real-time Job Crawling**: Scrapes actual job boards for current openings
- **AI-Powered Matching**: Uses AI (OpenAI, Claude, or Google AI) to score and rank job matches
- **Live Console**: Real-time progress tracking during crawling and analysis
- **Export Options**: Download results as JSON or CSV
- **Dark Theme**: Professional black and green interface

## Setup

1. **Get API keys**:

   - **Hyperbrowser API key** at [hyperbrowser.ai](https://hyperbrowser.ai) (required for web scraping)
   - **AI Provider API key** (choose one):
     - **OpenAI API key** at [platform.openai.com](https://platform.openai.com/api-keys) (default)
     - **Anthropic API key** at [console.anthropic.com](https://console.anthropic.com/settings/keys) (for Claude)
     - **Google AI API key** [FREE] at [aistudio.google.com](https://aistudio.google.com/apikey) (for Gemini)

2. **Clone and install**:

   ```bash
   git clone <repository-url>
   cd deep-ai-job-researcher
   npm install
   ```

3. **Environment setup**:
   Create a `.env.local` file in the project root with:

   ```bash
   # Required: Hyperbrowser API key for web scraping
   HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here

   # Required: Choose ONE AI provider (priority: OPENAI > ANTHROPIC > GOOGLE_AI)
   # Option 1: OpenAI (default)
   OPENAI_API_KEY=sk_your_openai_api_key_here

   # Option 2: Anthropic (Claude)
   # ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key_here

   # Option 3: Google AI (Gemini)
   # GEMINI_API_KEY=your_google_ai_api_key_here

   # Optional: Explicitly set provider (openai, claude, or google), disabled by default
   # AI_PROVIDER=openai

   # Optional: Model selection (defaults shown below)
   # OPENAI_MODEL=gpt-4o-mini
   # ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
   # GOOGLE_AI_MODEL=gemini-1.5-flash
   ```

   The app will automatically detect which provider to use based on available API keys. Priority order: `OPENAI_API_KEY` > `ANTHROPIC_API_KEY` > `GOOGLE_AI_API_KEY`. You can also explicitly set `AI_PROVIDER` to override auto-detection.

   ### Model Selection

   You can customize which model to use for each provider by setting the corresponding environment variable:

   **OpenAI Models:**

   > NOTE: define with `OPENAI_MODEL={openAI_model}`

   - `gpt-4o-mini` (default) - Fast and cost-effective
   - `gpt-4o` - More capable, higher cost
   - `gpt-4-turbo` - High performance
   - `gpt-3.5-turbo` - Legacy option

   **Claude Models:**

   > NOTE: define with `ANTHROPIC_MODEL={anthropic_model}`

   - `claude-3-5-sonnet-20241022` (default) - Latest and most capable
   - `claude-3-opus-20240229` - Most powerful
   - `claude-3-sonnet-20240229` - Balanced performance
   - `claude-3-haiku-20240307` - Fastest and most affordable
   - Any other Claude model name - You can use any available Claude model by setting `ANTHROPIC_MODEL` to the model name

   **Note:** Claude Code models (if available) can be used by setting `ANTHROPIC_MODEL` to the specific code model name. All Claude models work with the same API, so any model name supported by Anthropic will work.

   **Google AI Models:**

   - `gemini-1.5-flash` (default) - Fast and efficient
   - `gemini-1.5-pro` - More capable
   - `gemini-pro` - Legacy option

   ### Recommended Models for Resume Evaluation & Job Matching

   For the best results when analyzing resumes and matching candidates with job opportunities, consider these models:

   **For Resume Analysis (Extracting Candidate Profiles):**

   - **OpenAI**: `gpt-4o` or `gpt-4o-mini` - Excellent at structured data extraction and understanding technical skills
   - **Claude**: `claude-3-5-sonnet-20241022` (recommended) or `claude-3-opus-20240229` - Superior at understanding context and career progression
   - **Google AI**: `gemini-1.5-pro` - Strong at parsing complex resume formats and extracting nuanced information

   **For Job Matching & Scoring:**

   - **OpenAI**: `gpt-4o` (recommended) - Best balance of accuracy and cost for matching algorithms
   - **Claude**: `claude-3-5-sonnet-20241022` (recommended) - Excellent at understanding job requirements and candidate fit
   - **Google AI**: `gemini-1.5-pro` - Good for complex matching scenarios with multiple criteria

   **Cost-Effective Options (Good Quality, Lower Cost):**

   - **OpenAI**: `gpt-4o-mini` - Fast and affordable, suitable for high-volume processing
   - **Claude**: `claude-3-haiku-20240307` - Fastest Claude model, good for quick analysis
   - **Google AI**: `gemini-1.5-flash` - Very fast and cost-effective

   **Best Overall Recommendations:**

   - **Best Quality**: `claude-3-5-sonnet-20241022` or `gpt-4o` - Superior understanding of career context and job requirements
   - **Best Value**: `gpt-4o-mini` or `gemini-1.5-flash` - Excellent quality-to-cost ratio
   - **Best Speed**: `gemini-1.5-flash` or `claude-3-haiku-20240307` - Fastest responses for real-time matching

   **Example Configuration for High-Quality Matching:**

   ```bash
   # For best resume analysis and job matching quality
   ANTHROPIC_API_KEY=sk-ant-your_key_here
   ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
   ```

   ```bash
   # For best balance of quality and cost
   OPENAI_API_KEY=sk_your_key_here
   OPENAI_MODEL=gpt-4o
   ```

4. **Quick start**:
   ```bash
   npm run dev
   ```

## Usage

1. Toggle between Resume or Portfolio mode
2. Upload a PDF resume or enter a portfolio URL
3. Watch the live console as the app crawls job boards
4. Review AI-matched job opportunities with scores and tailored pitches
5. Export results or copy outreach emails

## Growth Use Case

Perfect for job seekers who want to automate the discovery and matching process with real-time job market data, demonstrating Hyperbrowser's ability to turn any website into structured data.

---

Follow @hyperbrowser_ai for updates.
