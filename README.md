# AI Assited Job Hunter aka Deep Job Researcher

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
   Copy the example environment file and fill in your API keys:

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` with your API keys. The file should contain:

   ```bash
   # REQUIRED 
   # Hyperbrowser API key (for web scraping)
   
   HYPERBROWSER_API_KEY="your_hyperbrowser_api_key_here"

   # REQUIRED: Choose ONE AI provider 
   
   # Option 1: OpenAI (default)
   OPENAI_API_KEY="sk_your_openai_api_key_here" # or service account API key

   # Option 2: Anthropic (Claude)
   ANTHROPIC_API_KEY="sk-ant-your_anthropic_api_key_here"

   # Option 3: Google AI (Gemini)
   # Note: Both GOOGLE_AI_API_KEY and GEMINI_API_KEY are supported
   GOOGLE_AI_API_KEY="your_google_ai_api_key_here"
   # OR
   # GEMINI_API_KEY="your_google_ai_api_key_here"

   # Optional: Explicitly set provider (openai, claude, or google), disabled by default
   
   # AI_PROVIDER=openai

   # Optional: Model selection (defaults shown below)
   # OPENAI_MODEL=gpt-4o-mini
   # ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
   # GOOGLE_AI_MODEL=gemini-1.5-flash
   ```
---
   
   **NOTE:** The app will attempt automatically detect which provider to use based on available API keys. 
   
   AI provider priority order is as follows: 
   
   >`OPENAI_API_KEY` > `ANTHROPIC_API_KEY` > `GOOGLE_AI_API_KEY`(‡)
   
   > **(‡)**: `GEMINI_API_KEY` is also acceptable

   You can also *explicitly* set `AI_PROVIDER` to override auto-detection.

   ## Model Selection

   You can customize which model to use for each provider by setting the corresponding environment variable:

   | Provider | Model Name | Default | Description |
   |----------|------------|---------|-------------|
   | **OpenAI** | `gpt-4o-mini` | Yes | Fast and cost-effective |
   | **OpenAI** | `gpt-4o` | | More capable, higher cost |
   | **OpenAI** | `gpt-4-turbo` | | High performance |
   | **OpenAI** | `gpt-3.5-turbo` | | Legacy option |
   | **Anthropic/Claude** | `claude-sonnet-4-5` | Yes | Latest and most capable |
   | **Anthropic/Claude** | `claude-opus-4-5` | | Most powerful † |
   | **Anthropic/Claude** | `claude-haiku-4-5` | | Balanced performance |
   | **Anthropic/Claude** | `claude-3-5-haiku-latest` | | Fastest and affordable* |
   | **Anthropic/Claude** | Any other Claude model `†` | | Use any available Claude model by setting `ANTHROPIC_MODEL` |
   | **Google/Gemini** | `gemini-1.5-flash` | Yes | Fast and efficient |
   | **Google/Gemini** | `gemini-1.5-pro` | | More capable |
   | **Google/Gemini** | `gemini-pro` | | Legacy option |

   **Claude Model [foot]Notes:**
   
   + Any other Claude model name can be used by setting `ANTHROPIC_MODEL` to the model name. Claude Code models (if available) can also be used this way. All Claude models work with the same API, so any model name supported by Anthropic will work.

   + **†:** Claude uses cryptic model names like `claude-opus-4-5-20251101` (aliases available, but can get confusibng). For more information on available models, see the [Claude model overview documentation](https://platform.claude.com/docs/en/about-claude/models/overview).

   ---
   
   ### Recommended Models for Resume Evaluation & Job Matching

   For the best results when analyzing resumes and matching candidates with job opportunities, consider these models:

   **For Resume Analysis (Extracting Candidate Profiles):**

   - **OpenAI**: `gpt-4o` or `gpt-4o-mini` - Excellent at structured data extraction and understanding technical skills
   - **Claude**: `claude-3-7-sonnet-latest` (recommended) or `claude-opus-4-0` - Superior at understanding context and career progression
   - **Google AI**: `gemini-1.5-pro` - Strong at parsing complex resume formats and extracting nuanced information

   **For Job Matching & Scoring:**

   - **OpenAI**: `gpt-4o` (recommended) - Best balance of accuracy and cost for matching algorithms
   - **Claude**: `claude-sonnet-4-0` (recommended) - Excellent at understanding job requirements and candidate fit
   - **Google AI**: `gemini-1.5-pro` - Good for complex matching scenarios with multiple criteria

   **Cost-Effective Options (Good Quality, Lower Cost):**

   - **OpenAI**: `gpt-4o-mini` - Fast and affordable, suitable for high-volume processing
   - **Claude**: `claude-3-5-haiku-latest` - Fastest Claude model, good for quick analysis
   - **Google AI**: `gemini-1.5-flash` - Very fast and cost-effective

   **Best Overall Recommendations:**

   - **Best Quality**: `claude-3-7-sonnet-latest` or `gpt-4o` - Superior understanding of career context and job requirements
   - **Best Value**: `gpt-4o-mini` or `gemini-1.5-flash` - Excellent quality-to-cost ratio
   - **Best Speed**: `gemini-1.5-flash` or `claude-3-haiku-20240307` - Fastest responses for real-time matching

   **Example Configuration for High-Quality Matching:**

   ```bash
   # For best resume analysis and job matching quality
   
   ANTHROPIC_API_KEY=sk-ant-your_key_here
   ANTHROPIC_MODEL=claude-sonnet-4-0
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

## Future enhancements

- Expand job board search and scraping using newer methods that allow for easier extraction of JavaScript heavy webpages.
- Add support for linkedin profile import
- Allow real-time model selection
- Add chat feature to chat with the model after analysis

---

## Much thanks to the folks at @hyperbrowser_ai for their awesome starter templates!!

Follow @hyperbrowser_ai for updates.

**Built with [Hyperbrowser](https://hyperbrowser.ai)**
