'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Image from "next/image";
import Link from "next/link";

function HomeContent() {
  const searchParams = useSearchParams();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  useEffect(() => {
    // Check if the user just logged out
    const wasLoggedOut = searchParams.get('logout') === 'true';
    
    if (wasLoggedOut) {
      // Ensure we clear the session
      supabase.auth.signOut().catch(err => 
        console.error('Error clearing session after logout:', err)
      );
    }
  }, [searchParams, supabase.auth]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 bg-[#F8F9FA]  shadow border-b border-[#DDE5E7] dark:border-[#E0E0E0]">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center">
              <Image 
                src="/LOGO2.png" 
                alt="Compassionate Care Transportation" 
                width={280}
                height={64}
                className="h-16 w-auto"
              />
            </Link>
          </div>
          <nav>
            <ul className="flex space-x-6">
              <li>
                <Link href="/login" className="text-[#7CCFD0] hover:text-[#60BFC0]">
                  Facility Login
                </Link>
              </li>
              <li>
                <Link href="#contact" className="bg-[#7CCFD0] text-white px-4 py-2 rounded hover:bg-[#60BFC0]">
                  Contact Sales
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        <section className="py-16 px-4 bg-gradient-to-b from-[#7CCFD0]/10 to-white">
          <div className="container mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-[#2E4F54] text-gray-900">
              Streamline Your Facility&apos;s Transportation Management
            </h2>
            <p className="text-xl mb-10 max-w-3xl mx-auto text-[#2E4F54]/80 text-gray-900/80">
              Efficiently manage transportation for all your clients with our comprehensive facility portal. 
              Perfect for healthcare facilities, nursing homes, rehabilitation centers, and senior living communities.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/login" className="bg-[#7CCFD0] text-white px-6 py-3 rounded-lg hover:bg-[#60BFC0] font-medium">
                Access Facility Portal
              </Link>
              <Link href="#features" className="border border-[#DDE5E7] dark:border-[#E0E0E0] px-6 py-3 rounded-lg hover:bg-[#F8F9FA] dark:hover:bg-[#24393C] font-medium text-[#2E4F54] text-gray-900">
                See Features
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 px-4 bg-[#F8F9FA] ">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-[#2E4F54] text-gray-900">
              Facility Management Features
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white  p-6 rounded-lg border border-[#DDE5E7] dark:border-[#E0E0E0]">
                <div className="text-3xl mb-4">👥</div>
                <h3 className="text-xl font-bold mb-2 text-[#2E4F54] text-gray-900">Client Management</h3>
                <p className="text-[#2E4F54]/70 text-gray-900/70">
                  Manage all your clients in one place. Track medical needs, accessibility requirements, and transportation history.
                </p>
              </div>
              
              <div className="bg-white  p-6 rounded-lg border border-[#DDE5E7] dark:border-[#E0E0E0]">
                <div className="text-3xl mb-4">📅</div>
                <h3 className="text-xl font-bold mb-2 text-[#2E4F54] text-gray-900">Bulk Booking</h3>
                <p className="text-[#2E4F54]/70 text-gray-900/70">
                  Schedule transportation for multiple clients efficiently. Set up recurring trips for regular appointments.
                </p>
              </div>
              
              <div className="bg-white  p-6 rounded-lg border border-[#DDE5E7] dark:border-[#E0E0E0]">
                <div className="text-3xl mb-4">💰</div>
                <h3 className="text-xl font-bold mb-2 text-[#2E4F54] text-gray-900">Consolidated Billing</h3>
                <p className="text-[#2E4F54]/70 text-gray-900/70">
                  Single monthly invoice for all client trips. Detailed reporting and cost allocation tools.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-[#2E4F54] text-gray-900">
              How Facility Management Works
            </h2>
            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="bg-[#7CCFD0]/20 dark:bg-[#7CCFD0]/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#2E4F54] text-gray-900 text-2xl font-bold">1</span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-[#2E4F54] text-gray-900">Add Clients</h3>
                <p className="text-sm text-[#2E4F54]/70 text-gray-900/70">
                  Register your facility&apos;s clients with their medical and accessibility needs
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-[#7CCFD0]/20 dark:bg-[#7CCFD0]/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#2E4F54] text-gray-900 text-2xl font-bold">2</span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-[#2E4F54] text-gray-900">Book Trips</h3>
                <p className="text-sm text-[#2E4F54]/70 text-gray-900/70">
                  Schedule transportation for any client with our streamlined booking system
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-[#7CCFD0]/20 dark:bg-[#7CCFD0]/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#2E4F54] text-gray-900 text-2xl font-bold">3</span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-[#2E4F54] text-gray-900">Track & Manage</h3>
                <p className="text-sm text-[#2E4F54]/70 text-gray-900/70">
                  Monitor all trips in real-time and manage your transportation schedule
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-[#7CCFD0]/20 dark:bg-[#7CCFD0]/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#2E4F54] text-gray-900 text-2xl font-bold">4</span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-[#2E4F54] text-gray-900">Single Invoice</h3>
                <p className="text-sm text-[#2E4F54]/70 text-gray-900/70">
                  Receive one consolidated monthly invoice for all client transportation
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-[#7CCFD0] text-white">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Trusted by Healthcare Facilities</h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">
              Join dozens of healthcare facilities that trust Compassionate Care Transportation to manage their client transportation needs.
            </p>
            <div className="grid md:grid-cols-3 gap-8 text-center mb-10">
              <div>
                <div className="text-4xl font-bold mb-2">500+</div>
                <div className="opacity-80">Facilities Served</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">10,000+</div>
                <div className="opacity-80">Monthly Trips</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">98%</div>
                <div className="opacity-80">Satisfaction Rate</div>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="py-16 px-4">
          <div className="container mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold mb-6 text-[#2E4F54] text-gray-900">
              Get Started with Compassionate Care Transportation
            </h2>
            <p className="text-xl mb-8 text-[#2E4F54]/80 text-gray-900/80">
              Contact our sales team to learn how we can help streamline your facility&apos;s transportation management.
            </p>
            <div className="bg-[#F8F9FA]  p-8 rounded-lg border border-[#DDE5E7] dark:border-[#E0E0E0]">
              <div className="space-y-4 text-left">
                <div>
                  <strong className="text-[#2E4F54] text-gray-900">Email:</strong>
                  <span className="text-[#7CCFD0] ml-2">info@compassionatecaretransportation.com</span>
                </div>
                <div>
                  <strong className="text-[#2E4F54] text-gray-900">Phone:</strong>
                  <span className="text-[#2E4F54]/80 text-gray-900/80 ml-2">614-967-9887</span>
                </div>
                <div>
                  <strong className="text-[#2E4F54] text-gray-900">Hours:</strong>
                  <span className="text-[#2E4F54]/80 text-gray-900/80 ml-2">Monday – Sunday 8:00 am to 10:00 pm</span>
                </div>
                <div>
                  <strong className="text-[#2E4F54] text-gray-900">Address:</strong>
                  <span className="text-[#2E4F54]/80 text-gray-900/80 ml-2">5050 Blazer Pkwy Suite 100-B, Dublin, OH 43017</span>
                </div>
              </div>
              <Link href="/login" className="inline-block mt-6 bg-[#7CCFD0] text-white px-6 py-3 rounded-lg hover:bg-[#60BFC0] font-medium">
                Access Facility Portal
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#F8F9FA]  py-8 border-t border-[#DDE5E7] dark:border-[#E0E0E0]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-[#2E4F54]/70 text-gray-900/70 mb-4 md:mb-0">
              &copy; 2025 Compassionate Care Transportation for Facilities. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link href="#" className="text-[#2E4F54]/70 text-gray-900/70 hover:text-[#7CCFD0] dark:hover:text-[#7CCFD0]">
                Terms
              </Link>
              <Link href="#" className="text-[#2E4F54]/70 text-gray-900/70 hover:text-[#7CCFD0] dark:hover:text-[#7CCFD0]">
                Privacy
              </Link>
              <Link href="#contact" className="text-[#2E4F54]/70 text-gray-900/70 hover:text-[#7CCFD0] dark:hover:text-[#7CCFD0]">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}