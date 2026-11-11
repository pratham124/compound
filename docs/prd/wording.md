# Compound PRD: wording

An appendix of the [PRD](README.md). This is the exact text for screens that make a promise about data, money or AI. Change it only on purpose, since it says where people's data goes. `{braces}` mark filled-in values.

## AI sharing switches

On Settings → AI and assistants. All three are off until turned on.

**Header:** Choose what Compound's AI can read to answer chat questions and write recovery notes.

| Switch | Text under it |
|---|---|
| **Workouts** | Chat reads your workouts, PRs and routines. |
| **Health** | Chat and recovery notes read your daily sleep, steps, resting heart rate and HRV. Daily totals only. |
| **Money** | Chat reads transactions (merchant, amount, date, category), budgets and subscriptions. Never account numbers or names. |

**Footer:** What you share goes to Anthropic, the AI model's maker, only to write the answer. Anthropic doesn't train on it. Connected assistants, like Claude, have their own permissions.

## First-need prompt

Shown once in chat the first time a question needs a kind that's off.

> **Let chat see your {health data}?**
> To answer, chat needs {your daily sleep, steps, resting heart rate and HRV}. It's sent to Anthropic only to write the answer.
> [Turn on] [Not now]

After **Not now**, chat answers with what it can see and adds: "I can't see your {health data}. Turn it on in Settings → AI and assistants."

## Assistant consent page (OAuth)

Shown on the web after sign-in, when an assistant connects.

> **{Claude} wants to connect to Compound**
> It will be able to:
> ☐ Read your workouts, PRs and routines
> ☐ Read your daily health data (sleep, steps, resting heart rate, HRV)
> ☐ Read your transactions, budgets and subscriptions
> ☐ Save routines and log workouts
> ☐ Set budgets, relabel transactions and mark subscriptions
>
> Only what you tick is shared. {Claude} asks before each change. Undo changes or disconnect it any time in Settings → AI and assistants.
> [Allow] [Cancel]

All boxes start unticked. Allow is disabled until at least one is ticked.

## Confirm buttons

Shown in chat under a message that proposes a change. Chat explains the change in its own words. The server builds the buttons from the tool call, so the label always says what will run. There are two: the confirm label below, and **Not now**. Only tapping the confirm button runs the change. Typing "yes" doesn't.

| Tool | Confirm button |
|---|---|
| save_routine | Save "{name}" |
| log_workout | Log workout for {weekday} |
| set_budget | Set {category} to {amount} a month |
| recategorize_transaction | Move to {new category} |
| recategorize_transaction with apply_to_merchant | Move every {merchant} charge to {new category} |
| set_subscription_status (true) | Mark as {interval} subscription |
| set_subscription_status (false) | Not a subscription |

After the confirm button: "Done. Undo in Settings → AI and assistants." After Not now: "Okay, nothing changed."

## AI changes list

Each entry has **{summary}** on the first line, then "{source}, {relative time}" on a second line. {source} is "In-app chat" or the assistant's name. The {state} sits on the right.

| State | Shown as |
|---|---|
| applied | an **Undo** button |
| undone | "Undone {relative time}" |
| changed since | "Edited after {source} changed it. Undo isn't available." |

Undo asks first: "Undo this change? {summary in reverse}" [Undo] [Keep].

## Chat allowance

- **Heads-up at 80%:** "You've used most of today's chat. It resets at midnight."
- **Paused at 100%:** "Today's chat is used up. It resets at midnight. To keep asking about your data, connect Claude or another assistant in Settings → AI and assistants."

## Chat disclosure and limits

- **First message of every conversation:** "I'm Compound's AI. I can read the data you've shared and answer questions about training, recovery and spending. I can't give medical, treatment or investment advice."
- **Off-topic decline:** "I can only help with your Compound data and general training, recovery and money-habit questions."
- **MCP rate limit (tool result):** "Too many requests. Try again in {n} seconds."

## Recovery notes

**AI instructions (the fixed part of the prompt):** Write 2 to 4 short sentences to someone who trains, based only on these check results. Suggest a lighter workout or a rest day, and say which numbers led to it. Use plain words. Don't diagnose, don't mention illness or treatment, and don't tell them to see a doctor unless they asked. If sleep data was missing, say so. End with: "Your call: you know how you feel."

**Template fallback** (used past the monthly AI cap, or when AI sharing is off for both Health and Workouts):

> **Maybe take it easier today.** Compound noticed: {flag 1}; {flag 2}{; flag 3…}. A lighter workout or a rest day could help. Your call: you know how you feel.

Flag phrases:

| Flag | Phrase |
|---|---|
| Short sleep | your sleep has averaged {n}% below usual for 3 nights |
| High resting heart rate | your resting heart rate is {n} bpm above usual |
| Low HRV | your HRV has averaged {n}% below usual for 3 days |
| Training jump | your training volume this week is {n}% above your recent weeks |
| No rest | you've trained {n} days in a row |
| No sleep data (training-only check) | (appended) Sleep data wasn't available this morning. |

**Today card:** in this order:
1. A fixed headline: "Maybe take it easier today". Every note suggests a lighter workout or a rest day, so one headline fits all.
2. The message: the AI-written note, or the template's sentences without its bold title.
3. The numbers behind it, drawn rather than repeated as sentences. For example, last 3 nights' sleep against the usual as two bars, and days in a row as dots.
4. A link: "Turn off recovery notes".

There's no "Recovery note" label above it.

## Push notifications

**Before asking for iOS permission** (first time a kind becomes possible):

> **Get a heads-up from Compound?**
> {Recovery note: "A short note on mornings that call for an easier day."} {Budget: "A heads-up when a budget reaches 80% or 100%."} Never between {10 pm and 7 am}.
> [Allow notifications] [Not now]

**Lock-screen text.** It's generic, and never shows numbers, merchants or health details:

| Kind | Title | Body |
|---|---|---|
| Recovery note | Compound | Your recovery note for today is ready. |
| Budget alert | Compound | One of your budgets needs a look. |

**In-app budget alert** (one line under that budget's bar on the this month view, so it sits with the budget it's about):
- At 80%: "80% spent, {left} left this month."
- At 100%: "100% spent, nothing left this month." If spending is past the budget: "100% spent, {over} over this month."

**Paid for the month** (a budget whose spending this month is all from subscriptions, and not over; no alert, no line under it): the bar shows as full and reads "Paid for the month" with the amount, for example "Paid for the month, $59". Screen readers hear "{category}: paid for the month, {amount}."

## No bank linked

On the Money tab:

> **See your spending next to your training.**
> Link a bank to see spending by category, set budgets, find forgotten subscriptions and see what your gym costs per workout. Compound can only read your transactions. It can never move money.
> [Link a bank]

## Health data missing

On the Today card when no data of a type has ever arrived:

> **No {sleep} data yet.** Compound may not have permission to read it. [Check Health permissions]

## Account deletion

> **Delete your account?**
> Everything Compound holds about you is erased within 24 hours, and from backups within 35 days. Banks and assistants are disconnected. This can't be undone.
> [Delete my account] [Cancel]
