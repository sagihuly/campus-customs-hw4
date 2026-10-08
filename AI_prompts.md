# HW4 — AI Prompts

## Problem 1: Vibe coder prompts

### The first prompt — background for the project

```text
Let's start with my assignment in AI. In general we need to build a website for the Campus Customs store that sells Yale products, with an option to see products, open an account and talk with a chatbot that can help find products and display them on the website. It is important that it also know how to check prices, stock and sizes from the data and not just invent answers. We are supposed to use React with Vite and TypeScript for the website side, Python with FastAPI for the server side and PydanticAI for the Agent. We have a file data.zip that is supposed to contain a SQLite database with catalogue, inventory and users tables, including passwords that underwent hashing, and also product images whose paths appear in the data. Need also to look at yalebulldogblue.com to understand the design and the information about the store. For the model  we will use PORTKEY_API_KEY with luna 6. At the end we will need to upload the project to a public GitHub and submit the link in Canvas, but without uploading the database, the images or API keys
```

### Follow-up prompt — documentation rules and scope of the work

The first prompt described the project, but did not explicitly define the structure of the prompt log, its ongoing updating and the progress in one task each time.

```text
We have 13 tasks and I want us to progress each time only in one. In the first task I want you to create in the main folder of the project a file named AI_prompts.md in which we will document all the prompts that I give you throughout the work. It is important to me that you update this file continuously yourself every time we start a new task or I ask you for some correction. For each task there should be its number and title, the original prompt that I sent you, and if there were corrections then also the additional prompts and a short sentence explaining what was missing or what did not work in the previous result. Put in there also the current prompt as I wrote it, including the background on the project. It is important that the documentation be faithful to what I really asked, without rewriting or inventing prompts after the fact. Right now do only the first task and do not start building the rest of the website, we will progress later task after task.
```

## Problem 2: Analyze the database

### The original prompt

```text
Let's continue to task 2. I want you to go over the database that is located at data/campus_customs.db and check its structure so that we understand what information we are working with. Go over all the tables and especially catalogue, inventory and users, and see what fields there are in each one, what they contain and how they are connected to one another. In addition create a file named output/harness.md in which you will write all the tables and fields you found, and for each field add a short one-line explanation of what it does and why it is important for the website or the chatbot that we are building. Later in the assignment we will continue to update this file with information on the models, tools, safety and tests of the system. At this stage we are only analyzing the data and documenting what is in it, without changing the database or starting to build the website. And of course do not forget to add this prompt too to AI_prompts.md as part of task 2.
```

## Problem 3: Build the Campus Customs website

### The original prompt

```text
Let's continue to task 3, now I want us to start building the Campus Customs website itself. We will use React, Vite and TypeScript as we planned, and I want the website to look professional and cool to use, like a real online store. At the top there needs to be a navigation menu with the pages Home, Products, About Us, Log in and Create account. For the content of Home and About Us look at yalebulldogblue.com and take inspiration from it for the style and information about the store, but do not copy the texts from there, rather write original content that fits Campus Customs. On the Products page I want you to display the products from our database, including the images according to the paths that appear in the catalogue table, the product name, the price and a short description. It is important to use the real products and information from the data and not invent products. When clicking on a product a separate page for it should open, with a large image on one side and on the other side all its details, including full description, price, sizes and stock if the information exists. Make sure that the transition between the pages works and that the images really load as they should.
```


### Follow-up prompt — chat interface

The website and the API for products had already been built, but the interface still did not include a chat window that could be opened and typed into.

```text
Now we need to add a chat interface in the bottom right corner of the website, something that looks like a regular chatbot that one can open and type messages into. At this stage it still does not need to be connected to the Agent, only prepare the interface so that we can connect it to the Backend later. To read the products and images from the database one can already build a simple API with FastAPI in the file backend/main.py, which we will expand later when we get to task 5. Right now there is no need to build the Agent or add functionality that we have not requested yet, I first want the website and the pages themselves to work as they should. Add this prompt too to AI_prompts.md under task 3.
```


## Problem 4: Create account and login

### The original prompt

```text
Let's continue to task 4. Now I want us to add to the website a real option to open an account and log into it. On the Create account page there should be a form with first name, last name, email and password, and also an additional field to verify the password to make sure the user did not make a typing mistake. On the Log in page it should be possible to log in with email and password. It is important to me that everything work against our database and not only at the interface level, meaning that when someone creates a new account it needs to be saved in the users table, and when logging in the system needs to check that the details are correct. It is also important to handle cases such as an email that already exists, a wrong password or missing fields, and display appropriate messages to the user.
```


### Follow-up prompt — verification of hashing and account flow

What was missing was verification against the existing test account and a full test of a new user, saving it in the database and displaying the login state on the website.

```text
In terms of security, I want us to make sure passwords are not saved as plain text but by means of secure hashing, and that the login knows how to verify them properly, including compatibility with the way the existing passwords in the database were saved. There is already a test user in the database with the email [test@campuscustoms.yale.edu](mailto:test@campuscustoms.yale.edu) and the password password. Check that it is possible to log in with it , and also and create a new user for the test and make sure that it is also possible to log in with it and that it is really saved in the database. Also make sure that the website shows the user that they are logged in and that everything works as it should. At the end update the file output/harness.md with an explanation of how the login and account creation mechanism works, what information we save for each user and how the passwords are protected. Do not forget to add this prompt too to AI_prompts.md under task 4.
```

## Problem 5: PydanticAI agent backend

### Message 1 — connecting the chat to the Agent and FastAPI

```text
Let's continue to task 5, now we need to connect the chat that we built to a real Agent with PydanticAI and FastAPI. I want us to use backend/main.py for the API and that there be an endpoint there that receives messages from the website and returns answers from the Agent. In addition, the Agent needs to be separated into four files: backend/agent.py for the Agent itself, backend/tools.py for its tools, backend/models.py for the Pydantic types and backend/prompts/prompt.md for the System Prompt. It is important also not to harm what already works on the website in terms of products and users.
```

### Message 2 — System Prompt and safety rules

```text
Now let's also define the System Prompt of the chatbot, I want it to speak like an assistant of Campus Customs, in a nice and helpful way that suits the store. We also need to add basic safety rules, that it will not invent prices or stock, that it will not expose sensitive information and that it will not do actions the user is not authorized to do. We will expand this later. Add also the structures needed in models.py for chat answers and product cards if needed. In terms of the model we will use Portkey with the settings we already chose and the key PORTKEY_API_KEY, without saving the key in the code. It is important that the chat on the website already work with the Agent itself and not with dummy answers.
```

### Message 3 — verification of startup and chat flow

```text
Let's make sure now that everything really works. I want you to check that it is possible to start the server from the backend folder with uvicorn main --reload --port 8000, and that when I send a message in the chat on the website it really reaches the Agent through FastAPI and an answer comes back that is displayed on the website. In addition update output/harness.md with a short explanation of the connection between the website and FastAPI and how the Agent is loaded with the System Prompt and the model. And do not forget to document the three messages I sent you in task 5 in the file AI_prompts.md, with the exact title Problem 5: PydanticAI agent backend. Keep their original wording and do not invent after the fact what was missing, rather document corrections or problems only if there really were any.
```

### Findings verified in the test

- The command as written, `uvicorn main --reload --port 8000`, failed because it is missing the application name in the `module:attribute` format; from `backend` the command `../.venv/bin/uvicorn main:app --reload --port 8000` started successfully.
- A message sent through the website interface received `POST /api/chat` with HTTP 200, and an answer and five product cards appeared on the website. In this test Markdown markers in the text answer were displayed as regular characters.

## Problem 6: Tools: product info and stock

### The original prompt

```text
Let's continue to task 6. Now I want us to give the Agent tools that can retrieve real information from our database campus_customs.db. It needs to know how to find a product description, price and quantity in stock, including by size when someone asks it. It is important to me that all the information come directly from the database and not that the model invent prices or quantities. If a certain product or size is not in stock it needs to say this clearly. Let's build these tools in tools.py and connect them to the existing Agent.
```


### Follow-up prompt — explicit use of tools and result types

The instructions had already asked to use the catalogue tool, but did not require a new check in every factual question and did not separate between the type of a tool result and the type of the website's product card.

```text
Now we also need to update the System Prompt in the file backend/prompts/prompt.md so that the Agent understands when it needs to call these tools, especially when asked about prices and stock, and will not answer just from its own knowledge. In addition update backend/models.py with the appropriate return types for the results that come from the tools. Choose the fields according to what is in the database and what is really needed in order to return a good answer to the user.
```

### Follow-up prompt — tool tests and documentation of result fields

```text
Let's check that everything works as it should, including questions about prices, product descriptions and stock in different sizes, and also cases where something has run out of stock. Afterward update output/harness.md with a list of all the tools we built, which fields you chose to return from each tool and why. And of course document these messages in AI_prompts.md under the exact name Problem 6: Tools: product info and stock. Do not change other things that are not needed right now.
```

## Problem 7: Chat search that updates the page

### The original prompt

```text
Let's continue to task 7. I want us to add an option to search for products through the chat and that this will also affect what is displayed on the website. For example if a customer asks "what hoodies do you have?" the Agent needs to search in the database for all the matching products, and the website needs to display them automatically as product cards with an image, name, price and short description. It is important that this be based on our real products. The Agent needs to return the search results in a structured form through the API so that the Frontend can display them, and not only write the product names in the answer in the chat.
```


### Follow-up prompt — opening a product page and end-to-end verification

The search results had already appeared on the website; the continuation asks to verify that the chat cards use the existing details page and to sharpen the search and documentation instructions.

```text
Another important thing, I want the products that appear as a result of the chat search also to behave like the regular products on the website. Meaning that when one clicks on a product card it needs to open the product page that we already built in task 3, with a large image and all its details. Make sure we use the same page and do not build something separate. In addition update the System Prompt in backend/prompts/prompt.md so that the Agent knows when to search for products and how to return the results to the website. Let's check that the search really works end to end, that the Agent searches in catalogue, returns matching products and that it is possible to see and open them on the website also when they came from the chat. Update also output/harness.md with an explanation of how the search results pass from the Agent through the API to the website and how they are displayed, add these three messages to AI_prompts.md under the name  Problem 7: Chat search that updates the page.
```


## Problem 8: Customer memory

### The original prompt

```text
Let's continue to task 8. Now I want us to add to the chatbot a memory of the conversations with customers. When a user is logged into their account, their conversations need to be saved in the database, in a suitable table, and when they return to the website and log in again they will be able to see their history and continue the conversation. It is important that the history be associated with the correct account and that users not be able to see conversations of others. Guests who are not logged in still need to be able to use the chat, but there is no need to save history for them.
```

### Follow-up prompt — user identity and page context

A functional expansion that was requested after the completion of task 8; no failure in the previous result was reported.

```text
In addition I want the Agent to know with whom it is speaking, at least the name and email of the logged-in user. It is possible to pass this information through agent deps or tools, whatever fits better with the structure that we already built, but it is important that it come from the authenticated user. Another thing, it also needs to understand which page the user is on. For example if I am on the page of a certain shirt and ask in the chat "do you have this in pink?" it needs to understand that I mean the shirt I am looking at, without my having to explain again which product I am talking about.
```

### Follow-up prompt — test after refresh, logout and login

In the previous result the passing of context was tested with a simulated Agent, but refresh, logout and logging in again, or a live Agent answer about identity and product, were not verified in the browser.

```text
Let's check that everything really works, also after a refresh of the website and logging out and logging in again, and that the Agent correctly identifies the user and the product they are looking at. Update also output/harness.md with an explanation of how the conversation history is saved, which details of the customer the Agent receives and how the information about the current page is passed to it.  Document these three messages in AI_prompts.md under the title  Problem 8: Customer memory.
```

## Problem 9: Usability improvements

### Message 1 — the original prompt: filtering, sorting and mobile adaptation

```text
Let's continue to task 9. I want us to make some improvements to the usability of the website, but it is important to me to keep relatively simple solutions and not complicate the code too much. We will start with two improvements to the Frontend. The first is an option to filter the products by category, price and size, and also sort them by price. Of course according to the data that really exists in the database. The second is to improve the adaptation to mobile, mainly the menu, product cards and chat, so that the website looks good and is convenient to use also on small screens. Use as much as possible what we already built without changing things that are not needed.
```

### Message 2 — alternatives in stock and flexible search

```text
Now we will make two improvements also to the Agent and the Backend. The first is that if a customer asks for a product or size that is not in stock, the chatbot will try to offer them similar products that are available from the database, without inventing products or quantities. The second is to improve the search so that it knows how to handle a little better spelling mistakes and similar words such as hoodie and sweatshirt. There is no need here for embeddings or vector database or something complex, flexible text search with a few synonyms and simple matching to mistakes is enough. It is important to me that the changes be relatively small and not harm the tools and the search that already work.
```

### Message 3 — verification of the four improvements and usability documentation

```text
Let's make sure that all four improvements really work on the website, including a test of filtering and sorting, display on mobile, offering alternatives for products that are not in stock and search with similar words or spelling mistakes. In addition one needs to create a file output/usability.md before or during the implementation, and in it explain for each of the four improvements what we added and why it helps Campus Customs customers or the business itself. It is important that the documentation describe what we actually implemented. Add also our three messages to AI_prompts.md under the exact title Problem 9: Usability improvements.
```

## Problem 10: Style the website.

### The original prompt

```text
Let's continue to task 10, now I want us to improve the design of the website so that it looks like a professional and really invested online store. I think it would be good to go for a modern and clean style inspired by Yale, with dark blue, white and maybe a few complementary colors. It is important to me that it not look like a generic website but that it have character, with good fonts, a clear hierarchy, interesting titles and a bit of creativity in the design. It is possible to add also subtle animations and transitions, but that it not be too crowded.
```

### Correction message — product cards and the chat

In the previous design a general visual language was set, but the product cards remained relatively simple and the chat still felt like a separate floating window. The continuation asks to deepen the design in the two areas and to keep the mobile behavior and the existing functionality.

```text
I also want us to invest in how we display the products, maybe more beautiful cards, large images, hover effects and an arrangement that feels like a website of a real brand. The chat also needs to look better and fit into the design language of the website, and not feel like an addition they put on the side. Try to be a bit creative with the design, because this is an important part of the task, but keep a simple user experience and do not break anything that already works, including on mobile.
```

### Message 3 — checking consistency, animations and usability

```text
Let's go over the website and see that the design is really consistent on all the pages, that the animations work and that everything is still convenient to use. In addition create the file output/design.md with a short and concrete explanation of what we changed in the design and why in your opinion this should help customers stay on the website and buy. No need for a long essay, only the important things that we really did. And of course document these three messages in AI_prompts.md under the exact title Problem 10: Style the website.
```

### Message 4 — adding the design reasons in English

The previous document described the design components, but did not include the user's explanations and reasons in English.

```text
Regarding the file output/design.md, I want my explanations about the design I made and why I chose it to go in there. Write the following things:
I chose a modern and clean design that is based on Yale's colors, mainly dark blue and white, so that the website will feel connected to the university and give customers a feeling of a reliable and professional store. I also wanted to keep a design that is a little younger and more interesting and not look like a regular university website.
I improved the fonts, the titles and the hierarchy of the information so that it will be easy to understand the website and navigate in it. In addition, I chose to display the products with large images, clear product cards and subtle effects when passing over them, so that the products will look more attractive and encourage customers to look at more products and maybe also buy.
I added subtle animations and transitions so that using the website will be more pleasant, and I also adapted the design of the chat to the rest of the website so that it will feel like a natural part of the store and not like an external addition. My goal is that customers will feel comfortable using the chat and asking questions that will help them find products.
In addition, I made sure that the website also fits mobile, including the menu, the images, the product cards and the chat. This is important in my opinion because many customers browse stores from the phone, and I wanted it to be easy for them to find products and navigate the website also on small screens, without making an effort or giving up the purchase. I started the mobile adaptation already in task 9, and in this task I kept the same design language also on mobile.
Make sure first that all the things I described really exist on the website, and if something is missing tell me and do not write as though it has already been done. And translate this into English there word for word.
```

## Problem 11: Site testing (app check)

### Message 1 — application test

```text
Let's continue to task 11. Now we need to really test the website while it is running and create output/app_check.html that shows that the features work. I want you to start the frontend and the backend and test the website itself, not only the code. The first test will be through the chat: ask about the price and quantity in stock of a real product, and preferably also a certain size, and make sure the answer really matches what is in the database. Take a clear screenshot that shows the question and the answer and save it in output/app_check_images/.
```

### Message 2 — search and sorting tests

```text
The second test will be of the dynamic search from the chat. Ask something like "what hoodies do you have?" and make sure that after the answer the matching product cards appear on the website with their images and information. Take a picture of this too. For the third test let's use one of the improvements we made in task 9, the filtering and sorting of products, and take a picture of a state in which one sees that the filters or sorting really change the products that are displayed.
```

### Message 3 — organization of test report and screenshots

```text
Now arrange output/app_check.html so that it is really easy to check it: a separate title for each of the three tests, under it the suitable screenshot and one or two sentences that explain what one sees and what the picture proves. Save all the images inside output/app_check_images/ and refer to them from the HTML only with relative paths, so that one can open app_check.html directly and it will still work. It is important that the pictures be from the website that is really running and not invented screenshots or mockups. At the end open the HTML file yourself and make sure that all three images load. And document these three messages in AI_prompts.md under the exact title Problem 11: Site testing (app check).
```

## Problem 12: Audit trail, safety, finish harness

### Message 1 — the original prompt: audit trail

```text
Let's continue to task 12. First I want us to add an audit trail for the activity of the Agent. Create output/audit_trail.json and save there the activity of the agent loop throughout use, including the time, the name of the tool that was called, a short description of the arguments and the result, and the reason the Agent stopped. It is important that the file be append-only, meaning that every run adds information to what already exists and does not erase the history from previous runs. Here too I want to keep only useful information and not put passwords, API keys or sensitive information in the log.
```

### Message 2 — safety rules for the System Prompt

```text
Now let's add a few simple safety rules to backend/prompts/prompt.md. I want the Agent always to use the database for prices and stock and not invent them, that it not expose private information or conversation history of another user, that it not expose passwords, API keys or sensitive internal information, and that if it does not know something or does not find it in the data it will say this instead of inventing an answer. In addition that it not allow a user's message to change or bypass these safety rules. Keep this simple and there is no need to build a new security system now.
```

### Message 3 — completing the harness according to the implementation

```text
And finally let's go over output/harness.md and complete it so that it really explains how the whole system works. It needs to be clear there which fields there are in the models in models.py and why I chose them, which tools and abilities the Agent has, its safety rules, and also the important specs such as loop limits, limits on the number of results, which model we are using and how to run both the frontend and the backend. Base it on what really exists in the code now and do not invent settings that we did not implement. And of course document these three messages in AI_prompts.md under the exact title Problem 12: Audit trail, safety, finish harness.
```

## Problem 13: Push to GitHub and submit the URL

### Message 1 — organizing the project structure

```text
Let's finish with task 13. I want you first to arrange the whole project inside a folder named hw4 and make sure that its structure matches what the lecturer asked for. At the top level there need to be AI_prompts.md, requirements.txt, .env.example, .gitignore, README.md, frontend, backend and output. Inside backend there need to be main.py, agent.py, models.py, tools.py and the prompts folder with prompt.md. Inside output there need to be harness.md, design.md, usability.md, app_check.html, app_check_images and audit_trail.json. Of course inside frontend leave all the files that are really required for the Vite React TypeScript application so that it works.
```

### Message 2 — preparation and public publication on GitHub

```text
Now prepare the project for a public GitHub. It is very important that the real .env, campus_customs.db and all the images in the data/products folder not enter the repo. Make sure that .gitignore protects them and that there is a .env.example with placeholders only and without any real key. The data folder needs to remain local-only and not be in git. Also make sure that the README explains clearly how to put the data pack in the right place and how to run the frontend and the backend, including that the backend runs from within backend with uvicorn main --reload --port 8000. After everything is clean upload hw4 to a public GitHub repository. At the end I need the repo URL that I will submit in Canvas, not a zip. Document the messages of task 13 in AI_prompts.md under the exact title Problem 13: Push to GitHub and submit the URL.
```
