# Product Specification (original)

> This is the original product brief, preserved verbatim. It is the source of
> truth for *what* the product should do; the implementation lives in the app
> and the API contract in [`../backend-guide/`](../backend-guide/).
>
> Two decisions were taken during implementation that differ from the text below:
> the frontend is **React Native (Expo)** rather than Next.js — consistent with
> the "React Native / Mobile app" notes in section 6 — and Tailwind/shadcn were
> replaced by a token-based design system, since neither exists for React Native.

---

KitabDostu / Reader – Full Feature List
This document outlines all planned features for the Minimum Viable Product (MVP) and future development phases of the KitabDostu / Reader platform.

1. User Management & Profile
Authentication
User registration and login via:
Email
Google
Social media accounts (Facebook, Apple)
Password recovery
Optional Two-Factor Authentication (2FA)
User Profile
Profile avatar and biography
Reading statistics:
Total books read
Total pages read
Genre distribution (Pie Chart)
Annual Reading Goal
Example: "I will read 24 books this year."
Progress bar displaying completion percentage
Friends & Following
Follow other readers
View friends' reading activities and updates
Onboarding Quiz
During registration, users select:
Favorite genres
Favorite authors
Used to personalize recommendations and user experience

2. Social Features
Virtual Bookshelves
Default Shelves
Read
Currently Reading
Want to Read
Did Not Finish (DNF)
Custom Shelves
Users can create their own shelves, such as:
Favorites
Classics
Gift Ideas
Summer Reading
Sci-Fi Collection

Quotes
Share quotes from books
Extract text from book images using OCR (Optical Character Recognition)
Add aesthetic background images (Instagram Story style)
Like and comment on quotes

Reviews & Ratings
Rating system:
1–10 scale (similar to 1000Kitap)
or 1–5 stars (similar to Goodreads)
Spoiler Tags to hide sensitive content
Attach photos to reviews (e.g., physical copy of the book)

Buddy Reads
Private reading groups where friends can:
Read the same book together
Track each other's progress
Discuss chapters
Share notes and opinions

3. Book Discovery & Search
Smart Search
Search books by:
Title
Author
ISBN
Publisher
Features:
Typo correction ("Did you mean...?")

Filtering System
Filter books by:
Language (AZ, EN, TR, RU)
Genre (Novel, Mystery, Science, Fantasy, etc.)
Rating
Price range (Marketplace)

Book Details Page
Each book page includes:
Synopsis / Description
Author information
Other books by the same author
Average reader rating
Reviews and comments
Recommendation engine:
"Readers who enjoyed this book also liked..."

4. E-Commerce & Marketplace
Multi-Vendor Shopping Cart
Add books from multiple publishers to a single cart
Orders are automatically separated by publisher on the backend

Payment Methods
Online Payments
Visa
Mastercard
Local payment gateways (Payriff / GoldenPay)
Offline Payments
Cash on Delivery
POS Terminal on Delivery
Gift Cards
Platform wallet balance
Redeemable gift cards

Delivery Options
Courier delivery
Pickup points
Azerbaijan Post (Azərpoçt) for regional shipping

Order Management
Users can:
Track order status
Receive SMS notifications
Receive Push Notifications
Download electronic receipts (E-Receipts)

5. Gamification & Engagement
Reading Streaks
Daily reading streak tracking
Fire badge for continuous reading days

Achievement Badges
Examples:
First 10 Books
Quote Master
Genre Explorer
Book Collector
Reading Marathon
Bookworm

Leaderboards
Weekly and Monthly rankings based on:
Books read
Pages read
Reading activity

6. Administration & Management
Publisher Dashboard
Publishers can:
Add new books
Update book information
Manage pricing
View sales reports
Access analytics dashboard

Moderation Panel
Administrators can:
Remove inappropriate reviews
Remove offensive quotes
Manage reported content
Handle user complaints

Notification System
Users receive notifications when:
Someone follows them
A followed author releases a new book
An order is shipped
Someone comments on their review
Someone likes their quote

7. Mobile & Performance Features
Offline Mode
Users can:
Browse their bookshelves
Update reading progress without internet
Automatically synchronize data when back online

Dark & Light Mode
Manual theme switching
Automatic system-based theme detection

Progressive Web App (PWA)
Users can:
Install the platform directly from a browser
Experience app-like performance
Receive push notifications
Use offline capabilities








KitabDostu / Reader: Comprehensive MVP Research & Strategic Plan
This document provides a comprehensive overview of the KitabDostu (Reader) project, designed to become Azerbaijan's first all-in-one social networking and e-commerce platform for book lovers.

1. Competitor Analysis & Benchmarking
Platform
Strengths
Monetization Model
Key Takeaways
Goodreads
Massive book database, Amazon integration, comprehensive review system
Advertisements, Amazon affiliate commissions
Advanced review search and filtering are essential.
1000Kitap
Quote sharing, highly active community, strong React Native mobile experience
Premium membership, advertisements
Quotes should be at the center of social engagement.
StoryGraph
Advanced reading analytics (mood, pace), ad-free experience
Premium subscription ($4.99/month)
Readers enjoy visualizing their reading habits and statistics.
Libraff / Alinino
Local logistics, extensive Azerbaijani-language catalog
Direct book sales
Support for local payment systems and delivery services is crucial.


2. MVP Core Features
A. Social Features
Virtual Bookshelves
Read
Currently Reading
Want to Read
Did Not Finish (DNF)
Quote System
Share memorable passages from books.
Like and interact with quotes posted by other readers.
Reviews & Ratings
1–10 rating system.
Written reviews.
Spoiler tag support to hide sensitive content.
User Profile
Reading statistics.
Followers and following.
Annual reading goal and progress tracking.

B. E-Commerce Features
Unified Shopping Cart
Users can purchase books from multiple publishers through a single shopping cart.
Order Tracking
Track order status:
Preparing
Out for Delivery
Delivered
Book Detail Card
Each book page displays:
Social reviews
Ratings
Store price
"Add to Cart" button

3. Information Architecture (Sitemap)
Home
Trending books
Recently shared quotes
Personalized recommendations
Explore
Browse books
Filter by genre
Filter by language (AZ, EN, TR, RU)
Book Details
Book description
Author information
Publisher details
User ratings and reviews
Store price
Add to Cart
User Profile
Personal bookshelves
Reading statistics (charts)
Friends and followers
Checkout
Order summary
Delivery address
Payment method

4. Detailed User Flows
User Flow 1: Adding a Book to a Bookshelf
User searches for a book.
Opens the book detail page.
Clicks "Add to Shelf."
Selects a shelf:
Currently Reading
Read
Want to Read
DNF
System asks for the current reading progress (page number).
Book is added to the selected shelf.

User Flow 2: Purchasing a Book
User clicks "Add to Cart."
Opens the shopping cart.
Clicks "Checkout."
Enters delivery information.
Baku
Regional delivery
Selects payment method:
Online payment
Cash on Delivery (COD)
Order is confirmed.
The publisher receives the order notification.

5. Local Market & Logistics Strategy
Payment Integration
Payriff
MilliKart
Cash on Delivery (COD)
Delivery Options
Baku: Within 24 hours
Regional areas: 3–5 business days
Data Sources
Google Books API (Global)
National Library database
Local publisher databases

6. Technical Architecture (Full Stack)
Frontend
React Native In future plan to mobile app
Tailwind CSS
Shadcn UI
TanStack Query
Efficient server-state management
Data synchronization
Request caching
Also will habe aflfline mode in future 
Backend Node js olacag db yeqin postgres olacag
Mobile appdi

Initial Database Schema
Users
id
username
email
bio
avatar
goals
Books
id
title
author
isbn
language
cover_url
price
stock
User_Books (Bookshelves)
user_id
book_id
status
reading
read
want_to_read
dnf
progress_page
Reviews
id
user_id
book_id
rating
comment
is_spoiler
Orders
id
user_id
total_price
status
delivery_address

7. UI/UX Principles
Dark Mode
A comfortable reading experience with reduced eye strain.
Mobile-First Design
Approximately 80% of users are expected to access the platform from mobile devices.
Clean Typography
Readable typography for long-form content using fonts such as:
Inter
Serif fonts
Quick Actions
Long-press (mobile) or right-click (desktop) shortcuts for quickly adding books to shelves.

8. Risk Analysis & Mitigation
Risk
Probability
Mitigation Strategy
Limited book database
High
Manually curate the first 1,000 most popular books before launch.
Logistics delays
Medium
Partner with professional courier companies (e.g., 166 Courier).
Fake reviews
Low
Allow reviews only from users who purchased or added the book to their shelves.


9. Metrics & KPIs
Retention
Weekly returning user percentage.
Conversion Rate
Percentage of users who complete purchases after adding items to the cart.
Social Engagement
Average number of:
Quotes shared
Reviews written
Likes
Comments
per active user.

10. Next Steps
1. UI/UX Design
Design high-fidelity wireframes and prototypes in Figma.
2. Project Setup
Initialize the Next.js project.
Configure the repository structure.
Create GitHub branches:
main
frontend
backend
3. API Integration
Implement the first core feature:
Book search
Book details
Google Books API integration
Local database synchronization

Long-Term Vision
KitabDostu aims to become Azerbaijan's largest digital ecosystem for readers, combining the social experience of Goodreads, the engaging community of 1000Kitap, the advanced analytics of StoryGraph, and a fully integrated local book marketplace into one seamless platform.
	


Sprint 1 – MVP Foundation & Project Setup
📅 Deadline
10.08.2026
Objective
Bu sprintin əsas məqsədi layihənin ilkin işlək versəsini (MVP) formalaşdırmaq, komandanın iş prosesini düzgün təşkil etmək və növbəti sprintlər üçün möhkəm baza yaratmaqdır.
Sprint Deliverables
Frontend
1. Layihənin Frontend MVP versiyasını hazırlayın.
2. Əsas səhifələr və istifadəçi axınları işlək vəziyyətdə olmalıdır.
3. UI tam tamamlanmasa da, əsas funksionallıq nümayiş etdirilməlidir.
Documentation
Aşağıdakı sənədlər hazırlanmalı və GitHub repository-də yerləşdirilməlidir:
1. Project Documentation
  2.README.md faylı
1.Layihənin qısa təsviri
2.İstifadə olunan texnologiyalar
3.Quraşdırma (Installation)
4.İşə salınma addımları
5.Komanda üzvləri (istəyə bağlı)
GitHub Workflow
GitHub repository peşəkar şəkildə idarə olunmalıdır.
Minimum tələblər:
1. Repository-də ən azı aşağıdakı branch-lər mövcud olmalıdır:
1.main
2.frontend
3.backend
2. Komanda üzvləri dəyişiklikləri uyğun branch üzərindən etməli və merge prosesinə riayət etməlidirlər.
Team Collaboration
Layihə komanda işi prinsiplərinə uyğun şəkildə icra edilməlidir. Backend komandası yalnız öz hissəsini hazırlamaqla kifayətlənməməli, ehtiyac yarandıqda frontend komandasına API inteqrasiyası və texniki məsələlər üzrə dəstək göstərməlidir.
Acceptance Criteria
✅ Frontend MVP təqdim olunub.
✅ README.md və əsas layihə sənədləri hazırlanıb.
✅ GitHub branch strukturu tələblərə uyğundur.
✅ Komanda üzvləri Git workflow qaydalarına əməl ediblər.
✅ Backend və Frontend komandaları koordinasiyalı şəkildə əməkdaşlıq ediblər.