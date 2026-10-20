# Feed courses: starter list (20 Oct 2026)

15 real courses for the "Courses worth taking" strip on the Feed. Each address below was fetched on 20 Oct 2026: it answered 200, had a title and a picture, and had not moved. The admin page checks every address again when you add it, so a page that has since moved is refused with the address it now goes to.

## How to add them

1. Admin portal, then **Feed courses**.
2. Paste the lines from the box below (everything between the fences).
3. Press **Check and add**. Each line shows a tick or a reason. Lines that fail stay in the box so you can fix them and press the button again.

The format is `address | theme | why it is here | cost | title`. Cost and title are optional. I left the cost off the Coursera and AWS courses on purpose: Coursera changes which courses can be taken free, so I did not want to state it. Where a cost word is given (`free`), I am confident of it: Harvard CS50, MIT OpenCourseWare, fast.ai and Microsoft Learn publish these for free. You can set or change any cost on the admin page afterwards. A line with no cost shows no label on the card.

Where a page's own title is only "CS50" or is very long, the fifth part gives a clearer title.

```
https://www.coursera.org/learn/learning-how-to-learn | learning | What research says about learning, and tools for mastering hard subjects.
https://www.coursera.org/learn/mindshift | learning | On changing how you learn, for people who think they are bad at maths or science.
https://www.coursera.org/learn/public-speaking | speaking | An introduction to speaking in front of people with confidence.
https://www.coursera.org/learn/writing-for-business | business | The basics of clear writing at work.
https://www.coursera.org/learn/negotiation | business | A framework for negotiating, from a strategic point of view. | | Introduction to Negotiation
https://www.coursera.org/learn/work-smarter-not-harder | productivity | Time management for work and for life.
https://www.coursera.org/learn/entrepreneurship-1 | founders | Laying the foundation of a new business.
https://ocw.mit.edu/courses/15-390-new-enterprises-spring-2013/ | founders | MIT's course on starting new enterprises, with the lecture materials free to read. | free
https://cs50.harvard.edu/x/ | software-and-cloud | Harvard's famous introduction to computer science, free to take. | free | CS50x: Harvard's Introduction to Computer Science
https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/ | software-and-cloud | MIT's introduction to programming in Python, with the materials free to use. | free | MIT: Introduction to Computer Science and Programming in Python
https://course.fast.ai/ | software-and-cloud | A practical course in deep learning, free to take. | free
https://learn.microsoft.com/en-us/training/paths/microsoft-azure-fundamentals-describe-cloud-concepts/ | software-and-cloud | Microsoft's own free path on cloud concepts, a start for the Azure fundamentals exam. | free
https://learn.microsoft.com/en-us/training/paths/azure-fundamentals-describe-azure-architecture-services/ | software-and-cloud | The second Microsoft path for the Azure fundamentals exam: Azure architecture and services. | free
https://www.coursera.org/learn/aws-cloud-technical-essentials | software-and-cloud | An introduction to the AWS cloud, from Amazon Web Services.
https://www.coursera.org/learn/gcp-fundamentals | software-and-cloud | An introduction to Google Cloud's core infrastructure, from Google Cloud.
```

## Things worth knowing

- There is no interview-skills course on the list yet. The pages I guessed for that theme did not exist (a Coursera "career development" address had moved to an unrelated course, and the check would have refused it). Better to find one together than add a weak one.
- The big paid platforms: Udemy and Skillshare refuse automated checks (they answered 403), and my first guesses at LinkedIn Learning and Pluralsight addresses were wrong, so none are on this list. They can be added by hand: open the course, read it, and add it with its title, as `address | theme | why | paid | title`. The admin page marks these "not checked by us". Udemy's courses are made by individual instructors, so only add one you have looked at yourself.
- Commissions later: the plain address is what is stored, and the card link is built in one place (`courseLink` in `feedCoursesApi.ts`). If Udemy, Coursera or another provider accepts you into an affiliate programme, the tag is added there and the strip gets a disclosure line, as the books strip has for Amazon. No course needs re-adding. Check each programme's current terms when you apply.
- Duplicates are refused, and a course address is unique even if it was pasted with tracking bits on the end.
