# Compound PRD: categories

This is an appendix of `README.md` in the same folder. It lists Compound's 14 categories and how each Plaid category maps to one of them.

## The 14 categories

| Category | What goes in it | Counts as spending? |
| --- | --- | --- |
| Groceries | Supermarkets, farmers' markets, and beer, wine and liquor stores | Yes |
| Eating out | Restaurants, fast food, delivery, vending machines, delis and desserts | Yes |
| Coffee | Coffee shops and cafes | Yes |
| Gym and fitness | Gyms, fitness centers and workout classes | Yes |
| Health and pharmacy | Doctors, dentists, eye care, hospitals, pharmacies, supplements and mental health services | Yes |
| Transport | Gas, parking, tolls, public transit, taxis, ride shares, bikes, scooters, car repairs and car payments | Yes |
| Rent and utilities | Rent, mortgage payments, electricity and gas, water, sewage and garbage | Yes |
| Bills and fees | Phone, internet, cable, insurance, bank fees, taxes and government fees | Yes |
| Shopping | Stores and online shops, clothing, electronics, home and hardware | Yes |
| Entertainment and streaming | Streaming, music, movies, games, events, museums and amusement parks | Yes |
| Travel | Flights, hotels, rental cars and other trip costs | Yes |
| Other | Anything that does not fit above, including anything Plaid could not place | Yes |
| Income | Pay, interest, dividends, refunds, benefits and other money earned | No. Never counts as spending |
| Transfers | Moves between your own accounts, credit card payments, other loan payments and loan money received | No. Never counts as spending |

## Rules

- Compound always stores Plaid's original category next to its own. Nothing is thrown away.
- The mapping applies whatever Plaid's confidence level is. If Plaid is unsure, the person can fix the category.
- If Plaid adds a new detailed category later, it maps to Other until this table is updated. Budgets never break because of it.
- A person's edit to one transaction, or a merchant rule they set, always beats the mapping.
- Edits carry over when a pending charge is replaced by its posted version.
- Subscription auto-detection never looks at Groceries, Eating out, Coffee, Transport, Income or Transfers. People can still mark one of those as a subscription by hand.
- Credit card payments and loan payments are Transfers. The purchase was already counted when it was made, so it is not counted twice. Two exceptions: mortgage payments go to Rent and utilities and car payments to Transport, because the house or car never appears as a purchase of its own.

## Mapping from Plaid's detailed categories

Every detailed category in Plaid's file appears once. Where a call was debatable, the Notes column says so.

| Plaid primary | Plaid detailed | Compound category | Notes |
| --- | --- | --- | --- |
| INCOME | INCOME_CHILD_SUPPORT | Income |  |
| INCOME | INCOME_CONTRACTOR | Income |  |
| INCOME | INCOME_DIVIDENDS | Income |  |
| INCOME | INCOME_GIG_ECONOMY | Income |  |
| INCOME | INCOME_INTEREST_EARNED | Income |  |
| INCOME | INCOME_LONG_TERM_DISABILITY | Income |  |
| INCOME | INCOME_MILITARY | Income |  |
| INCOME | INCOME_RENTAL | Income |  |
| INCOME | INCOME_RETIREMENT_PENSION | Income |  |
| INCOME | INCOME_SALARY | Income |  |
| INCOME | INCOME_TAX_REFUND | Income |  |
| INCOME | INCOME_UNEMPLOYMENT | Income |  |
| INCOME | INCOME_OTHER | Income |  |
| LOAN_DISBURSEMENTS | LOAN_DISBURSEMENTS_AUTO | Transfers | Borrowed money coming in. It is not earned, so it is not Income. |
| LOAN_DISBURSEMENTS | LOAN_DISBURSEMENTS_CASH_ADVANCES | Transfers | Borrowed money coming in. It is not earned, so it is not Income. |
| LOAN_DISBURSEMENTS | LOAN_DISBURSEMENTS_EWA | Transfers | Borrowed money coming in. It is not earned, so it is not Income. |
| LOAN_DISBURSEMENTS | LOAN_DISBURSEMENTS_MORTGAGE | Transfers | Borrowed money coming in. It is not earned, so it is not Income. |
| LOAN_DISBURSEMENTS | LOAN_DISBURSEMENTS_PERSONAL | Transfers | Borrowed money coming in. It is not earned, so it is not Income. |
| LOAN_DISBURSEMENTS | LOAN_DISBURSEMENTS_STUDENT | Transfers | Borrowed money coming in. It is not earned, so it is not Income. |
| LOAN_DISBURSEMENTS | LOAN_DISBURSEMENTS_OTHER_DISBURSEMENT | Transfers | Borrowed money coming in. It is not earned, so it is not Income. |
| LOAN_PAYMENTS | LOAN_PAYMENTS_BNPL | Transfers | Loan payments are not spending. The purchase was counted when it was made. |
| LOAN_PAYMENTS | LOAN_PAYMENTS_CAR_PAYMENT | Transport | Debatable: a loan payment, but the car's cost never shows up as a separate purchase, so counting it here doesn't count anything twice. |
| LOAN_PAYMENTS | LOAN_PAYMENTS_CASH_ADVANCES | Transfers | Loan payments are not spending. The purchase was counted when it was made. |
| LOAN_PAYMENTS | LOAN_PAYMENTS_CREDIT_CARD_PAYMENT | Transfers | Loan payments are not spending. The purchase was counted when it was made. |
| LOAN_PAYMENTS | LOAN_PAYMENTS_EWA | Transfers | Loan payments are not spending. The purchase was counted when it was made. |
| LOAN_PAYMENTS | LOAN_PAYMENTS_MORTGAGE_PAYMENT | Rent and utilities | Debatable: a loan payment, but it plays the part of rent and the house never shows up as a purchase, so nothing is counted twice. |
| LOAN_PAYMENTS | LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT | Transfers | Loan payments are not spending. The purchase was counted when it was made. |
| LOAN_PAYMENTS | LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT | Transfers | Loan payments are not spending. The purchase was counted when it was made. |
| LOAN_PAYMENTS | LOAN_PAYMENTS_OTHER_PAYMENT | Transfers | Loan payments are not spending. The purchase was counted when it was made. |
| TRANSFER_IN | TRANSFER_IN_ACCOUNT_TRANSFER | Transfers |  |
| TRANSFER_IN | TRANSFER_IN_DEPOSIT | Transfers | Debatable: a cash deposit could be pay. Kept as Transfers; the person can change it. |
| TRANSFER_IN | TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS | Transfers |  |
| TRANSFER_IN | TRANSFER_IN_SAVINGS | Transfers |  |
| TRANSFER_IN | TRANSFER_IN_TRANSFER_IN_FROM_APPS | Transfers |  |
| TRANSFER_IN | TRANSFER_IN_WIRE | Transfers |  |
| TRANSFER_IN | TRANSFER_IN_OTHER_TRANSFER_IN | Transfers |  |
| TRANSFER_OUT | TRANSFER_OUT_ACCOUNT_TRANSFER | Transfers |  |
| TRANSFER_OUT | TRANSFER_OUT_CRYPTO | Transfers | Treated as moving money, not spending. |
| TRANSFER_OUT | TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS | Transfers |  |
| TRANSFER_OUT | TRANSFER_OUT_SAVINGS | Transfers |  |
| TRANSFER_OUT | TRANSFER_OUT_TRANSFER_OUT_FROM_APPS | Transfers |  |
| TRANSFER_OUT | TRANSFER_OUT_WIRE | Transfers |  |
| TRANSFER_OUT | TRANSFER_OUT_WITHDRAWAL | Transfers | Debatable: cash taken out is spent later where Compound cannot see it. |
| TRANSFER_OUT | TRANSFER_OUT_OTHER_TRANSFER_OUT | Transfers |  |
| BANK_FEES | BANK_FEES_ATM_FEES | Bills and fees |  |
| BANK_FEES | BANK_FEES_INSUFFICIENT_FUNDS | Bills and fees |  |
| BANK_FEES | BANK_FEES_INTEREST_CHARGE | Bills and fees | Interest on a credit card counts as a fee, not a payment. |
| BANK_FEES | BANK_FEES_FOREIGN_TRANSACTION_FEES | Bills and fees |  |
| BANK_FEES | BANK_FEES_OVERDRAFT_FEES | Bills and fees |  |
| BANK_FEES | BANK_FEES_LATE_FEES | Bills and fees |  |
| BANK_FEES | BANK_FEES_CASH_ADVANCE | Bills and fees |  |
| BANK_FEES | BANK_FEES_OTHER_BANK_FEES | Bills and fees |  |
| ENTERTAINMENT | ENTERTAINMENT_CASINOS_AND_GAMBLING | Entertainment and streaming | Debatable: no better fit among the 14. |
| ENTERTAINMENT | ENTERTAINMENT_MUSIC_AND_AUDIO | Entertainment and streaming |  |
| ENTERTAINMENT | ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS | Entertainment and streaming | Debatable: could be Travel on a trip. Kept as Entertainment. |
| ENTERTAINMENT | ENTERTAINMENT_TV_AND_MOVIES | Entertainment and streaming |  |
| ENTERTAINMENT | ENTERTAINMENT_VIDEO_GAMES | Entertainment and streaming |  |
| ENTERTAINMENT | ENTERTAINMENT_OTHER_ENTERTAINMENT | Entertainment and streaming |  |
| FOOD_AND_DRINK | FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR | Groceries | Debatable: bought to take home, so Groceries rather than Eating out. |
| FOOD_AND_DRINK | FOOD_AND_DRINK_COFFEE | Coffee |  |
| FOOD_AND_DRINK | FOOD_AND_DRINK_FAST_FOOD | Eating out |  |
| FOOD_AND_DRINK | FOOD_AND_DRINK_GROCERIES | Groceries |  |
| FOOD_AND_DRINK | FOOD_AND_DRINK_RESTAURANT | Eating out |  |
| FOOD_AND_DRINK | FOOD_AND_DRINK_VENDING_MACHINES | Eating out | Debatable: could be Shopping. Kept as Eating out because it is snacks and drinks. |
| FOOD_AND_DRINK | FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK | Eating out | Desserts, juice bars and delis. |
| GENERAL_MERCHANDISE | GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS | Shopping |  |
| GENERAL_MERCHANDISE | GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES | Shopping |  |
| GENERAL_MERCHANDISE | GENERAL_MERCHANDISE_CONVENIENCE_STORES | Shopping | Debatable: could be Groceries. Kept as Shopping because the mix is unknown. |
| GENERAL_MERCHANDISE | GENERAL_MERCHANDISE_DEPARTMENT_STORES | Shopping |  |
| GENERAL_MERCHANDISE | GENERAL_MERCHANDISE_DISCOUNT_STORES | Shopping |  |
| GENERAL_MERCHANDISE | GENERAL_MERCHANDISE_ELECTRONICS | Shopping |  |
| GENERAL_MERCHANDISE | GENERAL_MERCHANDISE_GIFTS_AND_NOVELTIES | Shopping |  |
| GENERAL_MERCHANDISE | GENERAL_MERCHANDISE_OFFICE_SUPPLIES | Shopping |  |
| GENERAL_MERCHANDISE | GENERAL_MERCHANDISE_ONLINE_MARKETPLACES | Shopping |  |
| GENERAL_MERCHANDISE | GENERAL_MERCHANDISE_PET_SUPPLIES | Shopping |  |
| GENERAL_MERCHANDISE | GENERAL_MERCHANDISE_SPORTING_GOODS | Shopping |  |
| GENERAL_MERCHANDISE | GENERAL_MERCHANDISE_SUPERSTORES | Shopping | Debatable: Target and Walmart sell groceries too. Kept as Shopping because the mix is unknown. |
| GENERAL_MERCHANDISE | GENERAL_MERCHANDISE_TOBACCO_AND_VAPE | Shopping |  |
| GENERAL_MERCHANDISE | GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE | Shopping |  |
| HOME_IMPROVEMENT | HOME_IMPROVEMENT_FURNITURE | Shopping |  |
| HOME_IMPROVEMENT | HOME_IMPROVEMENT_HARDWARE | Shopping |  |
| HOME_IMPROVEMENT | HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE | Shopping | Debatable: could be Rent and utilities. Kept as Shopping. |
| HOME_IMPROVEMENT | HOME_IMPROVEMENT_SECURITY | Shopping |  |
| HOME_IMPROVEMENT | HOME_IMPROVEMENT_OTHER_HOME_IMPROVEMENT | Shopping |  |
| MEDICAL | MEDICAL_DENTAL_CARE | Health and pharmacy |  |
| MEDICAL | MEDICAL_EYE_CARE | Health and pharmacy |  |
| MEDICAL | MEDICAL_NURSING_CARE | Health and pharmacy |  |
| MEDICAL | MEDICAL_PHARMACIES_AND_SUPPLEMENTS | Health and pharmacy |  |
| MEDICAL | MEDICAL_PRIMARY_CARE | Health and pharmacy |  |
| MEDICAL | MEDICAL_VETERINARY_SERVICES | Other | Debatable: this is care for pets, not for the person. |
| MEDICAL | MEDICAL_OTHER_MEDICAL | Health and pharmacy |  |
| PERSONAL_CARE | PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS | Gym and fitness |  |
| PERSONAL_CARE | PERSONAL_CARE_HAIR_AND_BEAUTY | Other | Debatable: could be Shopping. Kept as Other. |
| PERSONAL_CARE | PERSONAL_CARE_LAUNDRY_AND_DRY_CLEANING | Other |  |
| PERSONAL_CARE | PERSONAL_CARE_OTHER_PERSONAL_CARE | Health and pharmacy | Debatable: Plaid puts mental health apps and services here, so Health and pharmacy. |
| GENERAL_SERVICES | GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING | Bills and fees | Debatable: a fee for a service, so Bills and fees. |
| GENERAL_SERVICES | GENERAL_SERVICES_AUTOMOTIVE | Transport | Debatable: car repairs and washes are kept with Transport. |
| GENERAL_SERVICES | GENERAL_SERVICES_CHILDCARE | Other |  |
| GENERAL_SERVICES | GENERAL_SERVICES_CONSULTING_AND_LEGAL | Other |  |
| GENERAL_SERVICES | GENERAL_SERVICES_EDUCATION | Other | Tuition has no better fit among the 14. |
| GENERAL_SERVICES | GENERAL_SERVICES_INSURANCE | Bills and fees |  |
| GENERAL_SERVICES | GENERAL_SERVICES_POSTAGE_AND_SHIPPING | Other |  |
| GENERAL_SERVICES | GENERAL_SERVICES_STORAGE | Bills and fees | Debatable: it is a monthly bill, so Bills and fees. |
| GENERAL_SERVICES | GENERAL_SERVICES_OTHER_GENERAL_SERVICES | Other |  |
| GOVERNMENT_AND_NON_PROFIT | GOVERNMENT_AND_NON_PROFIT_DONATIONS | Other | Debatable: a donation is not a government fee, so Other. |
| GOVERNMENT_AND_NON_PROFIT | GOVERNMENT_AND_NON_PROFIT_GOVERNMENT_DEPARTMENTS_AND_AGENCIES | Bills and fees |  |
| GOVERNMENT_AND_NON_PROFIT | GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT | Bills and fees |  |
| GOVERNMENT_AND_NON_PROFIT | GOVERNMENT_AND_NON_PROFIT_OTHER_GOVERNMENT_AND_NON_PROFIT | Bills and fees | Debatable: may include non-profits. Kept with government. |
| TRANSPORTATION | TRANSPORTATION_BIKES_AND_SCOOTERS | Transport |  |
| TRANSPORTATION | TRANSPORTATION_GAS | Transport |  |
| TRANSPORTATION | TRANSPORTATION_PARKING | Transport |  |
| TRANSPORTATION | TRANSPORTATION_PUBLIC_TRANSIT | Transport |  |
| TRANSPORTATION | TRANSPORTATION_TAXIS_AND_RIDE_SHARES | Transport |  |
| TRANSPORTATION | TRANSPORTATION_TOLLS | Transport |  |
| TRANSPORTATION | TRANSPORTATION_OTHER_TRANSPORTATION | Transport |  |
| TRAVEL | TRAVEL_FLIGHTS | Travel |  |
| TRAVEL | TRAVEL_LODGING | Travel |  |
| TRAVEL | TRAVEL_RENTAL_CARS | Travel | Debatable: could be Transport. Kept as Travel. |
| TRAVEL | TRAVEL_OTHER_TRAVEL | Travel |  |
| RENT_AND_UTILITIES | RENT_AND_UTILITIES_GAS_AND_ELECTRICITY | Rent and utilities |  |
| RENT_AND_UTILITIES | RENT_AND_UTILITIES_INTERNET_AND_CABLE | Bills and fees | Internet and phone go in Bills and fees. |
| RENT_AND_UTILITIES | RENT_AND_UTILITIES_RENT | Rent and utilities |  |
| RENT_AND_UTILITIES | RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT | Rent and utilities |  |
| RENT_AND_UTILITIES | RENT_AND_UTILITIES_TELEPHONE | Bills and fees | Internet and phone go in Bills and fees. |
| RENT_AND_UTILITIES | RENT_AND_UTILITIES_WATER | Rent and utilities |  |
| RENT_AND_UTILITIES | RENT_AND_UTILITIES_OTHER_UTILITIES | Rent and utilities |  |
| OTHER | OTHER_OTHER | Other | Plaid could not place it. |

## Source

- File: https://plaid.com/documents/pfc-taxonomy-all.csv
- Date fetched: Nov 4, 2026
- Taxonomy version: Personal Finance Category v2 (PFCv2). The file has 18 primary and 127 detailed v2 categories. It also lists the older v1 names in separate columns, which this table does not use. Plaid says v2 is a superset of v1. Some v2 primaries, such as LOAN_PAYMENTS, TRANSFER_IN and TRANSFER_OUT, also existed in v1.
