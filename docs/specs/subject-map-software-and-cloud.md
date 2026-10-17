# Subject map: Software and Cloud (draft 1)

Written 17 Oct 2026. The first profession in the feed's subject map (see `agent-driven-feed.md`).

**Status:** a first draft proposed by Claude from general knowledge. It is **not yet weighted** by what your users practise on (export the admin Subjects page as CSV to do that) and **needs your review**. Strike out anything weak, and add what is missing.

41 subjects in 9 groups. Each has a reason it matters and a sample interview question, which can seed the Question of the Day.

## The .NET backend

| Subject | Why it matters | Sample interview question | Keep? |
|---|---|---|---|
| C# fundamentals | The base of every .NET interview: async/await, LINQ, generics, memory and garbage collection. | How does async/await work, and what happens if you block on a Task? | |
| ASP.NET Core and Minimal APIs | How requests move through middleware, routing, dependency injection and authentication. | Walk me through what happens between a request arriving and your handler running. | |
| Entity Framework Core | Where many real production bugs hide: query translation, change tracking, migrations, N+1 queries. | Why might a LINQ filter work in memory but fail against SQL? | |
| API design | Interviewers judge how you design for other developers: REST, versioning, paging, errors, idempotency. | How would you design a safe retry for a payment endpoint? | |
| Clean structure: vertical slices, CQRS and MediatR | A popular alternative to layered code; shows you can organise a growing codebase. | When would you choose vertical slices over layers? | |
| Domain-driven design essentials | Bounded contexts, aggregates and a shared language between developers and the business. | What is an aggregate, and what problem does it solve? | |
| Testing | Unit, integration and end-to-end tests, test doubles, and how much testing is enough. | How do you decide what to test at each level? | |

## The front end

| Subject | Why it matters | Sample interview question | Keep? |
|---|---|---|---|
| React fundamentals and hooks | State, effects, rendering and the mistakes that cause bugs and slow pages. | Why does an effect run twice in development, and is that a bug? | |
| TypeScript | Types, generics and narrowing: what makes large front ends safe to change. | What is the difference between a type and an interface, and when does it matter? | |
| Data fetching and state | Loading, caching, errors and keeping the screen in step with the server. | How do you stop a slow response overwriting a newer one? | |
| Web performance and accessibility | Core Web Vitals, bundle size, keyboard use and screen readers. | How would you find out why a page feels slow? | |

## Architecture and system design

| Subject | Why it matters | Sample interview question | Keep? |
|---|---|---|---|
| System design interviews | The big senior-level round: scaling, caching, queues, consistency and trade-offs. | Design a service that shortens links for millions of users. | |
| Monolith, modular monolith and microservices | Knowing when not to split a system is as valued as knowing how. | What would make you break a monolith into services? | |
| Event-driven design and messaging | Queues, topics, ordering, duplicates and eventual consistency. | How do you handle the same message arriving twice? | |
| Reliability patterns | Timeouts, retries with backoff and jitter, circuit breakers, bulkheads. | A downstream service is slow. How do you stop it taking your service down? | |
| Caching | What to cache, where, for how long, and how to invalidate it. | What can go wrong with a cache, and how do you guard against it? | |
| Data modelling: relational and document | Choosing between SQL tables and document stores for real workloads. | When would you pick a document database over a relational one? | |

## Cloud, Azure first

| Subject | Why it matters | Sample interview question | Keep? |
|---|---|---|---|
| Azure core services | App Service, Functions, Static Web Apps and Storage: the usual building blocks. | When would you use Functions instead of an App Service? | |
| Azure data: SQL and Cosmos DB | Choosing, sizing and paying for the right database. | How does Cosmos DB partitioning affect cost and speed? | |
| Identity and access | Entra ID, OAuth 2 and OpenID Connect, JWTs, managed identities. | What is a managed identity and why is it safer than a secret? | |
| Cloud networking basics | DNS, load balancing, CDNs, private networks and why a call times out. | How does a request get from a browser to your app in the cloud? | |
| Cost management and right-sizing | Reading a bill, finding waste and choosing the cheapest tier that works. | Your cloud bill doubled. How do you find out why? | |
| AWS and multi-cloud awareness | Mapping Azure ideas to AWS and Google Cloud, since many roles span clouds. | What is the AWS equivalent of Azure Functions, and how do they differ? | |
| Infrastructure as code | Bicep and Terraform: repeatable environments and safe change. | Why define infrastructure in code instead of clicking in the portal? | |

## DevOps and operations

| Subject | Why it matters | Sample interview question | Keep? |
|---|---|---|---|
| CI/CD with GitHub Actions | Build, test and deploy automatically, with safe rollbacks. | How would you deploy without downtime, and roll back if it goes wrong? | |
| Containers and Kubernetes basics | Images, containers, orchestration and when it is overkill. | What does Kubernetes give you that App Service does not? | |
| Observability | Logs, metrics, traces and alerts that wake you for the right reasons. | A user says it is slow. What do you look at first? | |
| Incident response | Staying calm, finding the cause, communicating and learning afterwards. | Tell me about a production incident and what you changed afterwards. | |

## Security

| Subject | Why it matters | Sample interview question | Keep? |
|---|---|---|---|
| Secure coding and the OWASP Top 10 | Injection, broken access control and the usual web vulnerabilities. | How do you prevent SQL injection and broken access control? | |
| Secrets, keys and configuration | Where keys live, who can read them, and what happens when one leaks. | A key was pushed to a public repository. What do you do? | |

## Data

| Subject | Why it matters | Sample interview question | Keep? |
|---|---|---|---|
| SQL and indexing | Reading query plans, choosing indexes and fixing slow queries. | A query got slow as the table grew. How do you fix it? | |
| Transactions and concurrency | Isolation levels, locks, deadlocks and optimistic concurrency. | How do you stop two users overwriting each other's changes? | |

## AI engineering

| Subject | Why it matters | Sample interview question | Keep? |
|---|---|---|---|
| Building with LLMs | Calling models, prompting, structured output, cost and latency. | How do you make a model return reliable JSON? | |
| RAG and vector search | Giving a model your own data: chunking, embeddings, retrieval, citations. | How would you reduce wrong answers in a document question tool? | |
| Agents and tool use | Agents that call tools, plan steps and act, and how to keep them safe. | How do you stop an agent doing something you did not intend? | |
| Evaluating and monitoring AI systems | Test sets, quality scores, drift, cost control and safety checks. | How do you know a prompt change made things better? | |

## Working as an engineer

| Subject | Why it matters | Sample interview question | Keep? |
|---|---|---|---|
| Behavioural questions for engineers | Conflict, failure, ownership and influence, answered with the STAR method. | Tell me about a time you disagreed with a technical decision. | |
| Code review and technical writing | Giving and taking feedback, and writing design notes people read. | How do you give a hard code review kindly? | |
| Estimating and prioritising | Scoping honestly, saying no, and delivering the right thing first. | How do you estimate work you have never done? | |
| Explaining technical ideas simply | Talking to managers, clients and non-technical colleagues. | Explain our API to someone who has never programmed. | |
| Technical leadership | Tech lead and staff-level topics: influence, standards, mentoring, trade-offs. | How do you get a team to adopt a new standard? | |

## Next steps

1. Francis reviews and edits this list.
2. Weight each subject using the admin Subjects page export.
3. Build books, courses, videos and daily questions from the weighted list.
