# Student portal

Students now have a sidebar on desktop and an expandable menu on mobile. The dashboard also links to every section.

| Section | What students can do | How staff manage it |
| --- | --- | --- |
| My profile | View their school record and guardian details | Admin → Students |
| Finance | Read invoices, balances and successful payments; open and print receipts | Admin / Accountant → Fees; online payment remains in the guardian portal |
| Class timetable | Read their class timetable | Admin → Timetable |
| Attendance | Read their own attendance history | Teacher → Attendance / Gate scanner |
| Rate teachers | Save or update a 1–5 rating and comment for assigned teachers | Admin → Student feedback |
| My library | Open HTTPS reading and learning resources selected for their class | Admin / Teacher → Learning centre → My library |
| Examinations | View published exam dates and instructions; open published results | Learning centre → Examinations; existing results release controls still apply |
| Online classes | See scheduled sessions and open external meeting links | Learning centre → Online classes |
| Homework | Submit and update written answers before the deadline; read teacher feedback | Learning centre → Homework → Review submissions |
| Noticeboard | Read school announcements | Existing announcements workflow |

## Publishing activities

1. Open **Learning centre** in the admin or teacher portal.
2. Choose a section and a class. Teachers see classes they can access.
3. Select **Add activity** (or **Add resource**), enter the title and instructions, and publish.
4. Library resources and online classes require an HTTPS link. Homework, exams and online classes require a date; the date picker uses the staff member's local time.
5. The author or an administrator can edit or archive a publication. Archiving hides it from students while preserving submitted work.

Students see publications for their current class. Staff must publish school content before these sections contain activities. Library resources are links, online lessons use external meeting services, and examinations are schedules/instructions linked to the existing results workflow; this release does not include physical book lending, built-in video calls or an online exam-taking engine.

## Homework and feedback

Students can submit written answers up to 20,000 characters and update them until the deadline, provided their teacher has not reviewed them. To allow a late submission, the author or an administrator can extend the deadline. Reviewers can enter or update feedback; homework feedback does not automatically alter official marks.

Teacher ratings are identified, not anonymous. The student screen explains that school administrators can see the student's name, rating and comment. Teachers and other students cannot access that review feed. Each student has one updatable rating per assigned teacher.

## Deployment

Run the normal server migration command before starting the new API version. Migration `027_student_learning.sql` adds learning publications, homework submissions and teacher feedback with school-level row security. Render's configured build runs migrations automatically. The existing parent payment flow and results-release rules are reused.
