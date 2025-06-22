# Helipad to Nostr Webhook Bot

This project provides a webhook receiver to connect a [Helipad](https://github.com/Podcastindex-org/helipad) instance to a Nostr bot. When Helipad receives or sends a boost, it sends the data to this webhook, which then formats and posts a note to Nostr.

## Setup and Installation

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd BoostBot
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Create Your Environment File:**
    You must create a `.env` file in the root of the project. This file will hold your secret keys and configuration. It must contain the following variables:

    ```bash
    # Nostr Bot's private key (starts with nsec...)
    NOSTR_BOOST_BOT_NSEC=your_new_nsec_key_here

    # The port your webhook receiver will listen on
    PORT=3001

    # A strong, random secret token to share with Helipad
    HELIPAD_WEBHOOK_TOKEN=your_random_secret_token_here
    ```

4.  **Run the Server:**
    ```bash
    npx tsx helipad-webhook.js
    ```

5.  **Configure Helipad:**
    *   Set the webhook URL to `http://<your-server-ip>:<PORT>/helipad-webhook`.
    *   Set the Authorization Token to the `HELIPAD_WEBHOOK_TOKEN` you defined in your `.env` file.
    *   Choose the triggers (e.g., "New boosts", "New sent boosts").

## Security Notice
**DO NOT** commit your `.env` file to any public repository. It contains your private keys. This project is configured to ignore `.env` files via `.gitignore`. 