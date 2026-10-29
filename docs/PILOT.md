# Founder-led pilot

## Discovery before recruiting broadly

Interview 15–20 adults reachable through the founder's local network. Choose one city and two or three nearby neighbourhoods based on these participants, not the demo city's sample inventory.

Ask for concrete past behaviour:

1. Which console and physical format do you actually use? Does it have a disc drive?
2. Describe your last borrowed, swapped, bought, or lent game. How did you find the person? What went wrong?
3. Which five titles would you list today, and which three would you seek?
4. What prevents you from lending a finished game? What would make you comfortable meeting someone?
5. How far would you travel? What handover location and timing would work?
6. Why would you use this instead of your existing group chat? Ask them to demonstrate that group's current process.

Record consent, participant code, neighbourhood, console, title inventory, wanted titles, observed friction, and listing commitment. Do not collect identity documents or credentials. Keep interview notes separate from app data and set an agreed deletion date.

Gate: at least 15 owners committed to 50 real offers, with meaningful overlap against wanted titles. If not met, improve recruitment or pivot before broadening the build.

## Five-person prototype test

Ask participants to join, complete a profile, publish an offer, discover a compatible title, comment, send a message request, accept a request, and close a post. Do not coach their navigation. Record where they hesitate, whether they understand that no payment protection is provided, and whether a shelf item is mistaken for an available offer.

## Six-week pilot scorecard

Target 50–100 invited adults. Proposed thresholds are hypotheses, not market benchmarks:

| Metric              | Definition                                                                                                                                                                     | Decision threshold                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Activation          | Member makes a post, wanted post, or sends a relevant first message within seven days of joining.                                                                              | >=50%                                     |
| Useful response     | Post receives a relevant non-owner comment or listing-related message within seven days. Founder reviews relevance from participant feedback, without reading private inboxes. | >=40%                                     |
| Exchanges           | Both participants independently confirm a listing-related exchange.                                                                                                            | >=15 exchanges across >=10 distinct pairs |
| Retention           | Activated member performs a core action during days 22–28 after joining.                                                                                                       | >=30%                                     |
| Response operations | Initial human response to a report, not necessarily final resolution.                                                                                                          | <=24 hours                                |

Capture weekly denominators and observation windows. Do not count members who have not yet reached their retention window as churn. Repeated confirmations in one conversation count once in the initial implementation. Record repeated exchanges separately with consent if the pilot needs that distinction.

`pilot_metrics()` returns aggregate member/post/report and one-sided/mutual confirmation counts for an MFA-verified admin. Activation/retention and response relevance require the event scorecard and interview follow-up described below; they must not be inferred from signups or claimed from demo usage.

## Weekly review sheet

Record: cohort size; invitations accepted; activated members; eligible retention cohort; returning members; offers/wanted split; responses; one-sided and mutual confirmations; distinct pairs; reports and first-response time; unresolved cases; recruit/support/moderation hours; infrastructure expense; top three friction points.

Use content-free activity timestamps from `pilot_activity()` for activation and retention. See the database API migration for allowed event names. Do not capture message text, private meeting details, or negotiated amounts in analytics. A relevant-response judgement should come from an optional participant question, not automated keyword inference.

Decision at week six: expand to a nearby circle only if useful connections repeat. If use concentrates on searchable inventory, simplify toward a community catalogue. If people ask primarily to sell permanently, separately assess a resale flow. If people remain on existing chats, do not assume adding general social posts will fix the problem. A free pilot is not revenue validation.
