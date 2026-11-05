# Compound PRD: wording

An appendix of the [PRD](README.md). This is the exact text for screens that make a promise about data, money or AI. Change it only on purpose, since it says where people's data goes. `{braces}` mark filled-in values.

## AI sharing switches

On Settings → AI and assistants. All three are off until turned on.

**Header:** Compound's AI can read your data to answer questions in chat and to write deload messages. Choose what it can see. You can change this any time.

| Switch | Text under it |
|---|---|
| **Workouts** | Chat can read your workouts, PRs and routines. |
| **Health** | Chat and deload messages can read your daily sleep, steps, resting heart rate and HRV. Daily totals only, never minute-by-minute data. |
| **Money** | Chat can read your transactions (merchant, amount, date and category), budgets and subscriptions. Never your account numbers or account names. |

**Footer:** What you share is sent to Anthropic, the company that makes the AI model, only to write the answer. Anthropic doesn't train its models on it. Connected assistants, like Claude, have their own permissions, which you set when you connect them.

## First-need prompt

Shown once in chat the first time a question needs a kind that's off.

> **Let chat see your {health data}?**
> To answer this, chat needs to read {your daily sleep, steps, resting heart rate and HRV}. It's sent to Anthropic only to write the answer.
> [Turn on] [Not now]

After **Not now**, chat answers with what it can see and adds: "I can't see your {health data}. You can turn it on in Settings → AI and assistants."

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
> Only what you tick is shared. {Claude} will ask you before each change, and every change it makes can be undone in Compound under Settings → AI and assistants. You can disconnect it there any time.
> [Allow] [Cancel]

All boxes start unticked. Allow is disabled until at least one is ticked.

## Write cards

Shown in the in-app chat before each write. Buttons are always **[Apply] [Cancel]**.

| Tool | Card text |
|---|---|
| save_routine | **Save routine "{name}"**: {n} exercises, {total sets} sets. {first three exercise names}{", and more" if more} |
| log_workout | **Log a workout on {weekday, date}**: {n} exercises, {total sets} sets, {duration} min. |
| set_budget | **Set your {category} budget to {amount} a month** (now {current amount or "no budget"}). |
| recategorize_transaction | **Relabel {merchant}, {amount} on {date}**, from {old category} to {new category}. |
| recategorize_transaction with apply_to_merchant | **Relabel {merchant}, {amount} on {date}**, from {old category} to {new category}, **and every past and future {merchant} charge.** |
| set_subscription_status (true) | **Mark {merchant} as a {interval} subscription** of about {amount}. |
| set_subscription_status (false) | **Mark {merchant} as not a subscription.** Compound will stop suggesting it. |

After Apply: "Done. You can undo this in Settings → AI and assistants." After Cancel: "Cancelled, nothing changed."

## AI changes list

Each entry: **{summary}** · {source: "In-app chat" or the assistant's name} · {relative time} · {state}

| State | Shown as |
|---|---|
| applied | an **Undo** button |
| undone | "Undone {relative time}" |
| changed since | "Changed since. Undo isn't available because this was edited after {source} changed it." |

Undo asks first: "Undo this change? {summary in reverse}" [Undo] [Keep].

## Chat allowance

- **Heads-up at 80%:** "You've used most of today's chat. It resets at midnight."
- **Paused at 100%:** "That's today's chat used up. It resets at midnight. You can keep asking about your data by connecting Claude or another assistant in Settings → AI and assistants."

## Chat disclosure and limits

- **First message of every conversation:** "I'm Compound's AI. I can read the data you've shared and answer questions about your training, recovery and spending. I can't give medical, treatment or investment advice."
- **Off-topic decline:** "I can only help with your Compound data and general training, recovery and money-habit questions."
- **MCP rate limit (tool result):** "Too many requests. Try again in {n} seconds."

## Deload messages

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

**Today card:** the message, the numbers behind it, and a link: "Turn off deload messages".

## Push notifications

**Before asking for iOS permission** (first time a kind becomes possible):

> **Get a heads-up from Compound?**
> {Deload: "On mornings when your recovery and training suggest an easier day, Compound can send you a note."} {Budget: "Compound can tell you when a category reaches 80% and 100% of its budget."} Nothing is sent during your quiet hours ({10 pm to 7 am}).
> [Allow notifications] [Not now]

**Lock-screen text.** It's generic, and never shows numbers, merchants or health details:

| Kind | Title | Body |
|---|---|---|
| Deload message | Compound | Your training note for today is ready. |
| Budget alert | Compound | One of your budgets needs a look. |

**In-app budget alert** (on the this month view): "{category}: {spent} of {budget} spent ({80 or 100}%)."

## No bank linked

On the Money tab:

> **See your spending next to your training.**
> Link a bank to see where your money goes by category, set budgets, catch subscriptions you forgot about, and see what your gym costs per workout. Compound can only read your transactions. It can never move money.
> [Link a bank]

## Health data missing

On the Today card when no data of a type has ever arrived:

> **No {sleep} data yet.** If you've recorded it, Compound may not have permission to read it. [Check Health permissions]

## Account deletion

> **Delete your account?**
> This erases everything Compound holds about you within 24 hours: workouts, health data, transactions, chats and settings. Your bank connections are removed and connected assistants are disconnected. Backups are gone within 35 days. This can't be undone.
> [Delete my account] [Cancel]
