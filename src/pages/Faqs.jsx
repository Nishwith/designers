import React, { useState } from "react";
import { HelpCircle, ChevronDown, Award, Users, ShieldCheck, Mail, Star, MessageSquare, PauseCircle } from "lucide-react";
import { Link } from "react-router-dom";

const faqsList = [
  {
    icon: Award,
    question: "What is the Featured Badge?",
    answer: "The Featured Badge is a mark of excellence. It boosts your profile to the top of homeowner search results and adds a verified trust shield to your name.",
  },
  {
    icon: Star,
    question: "How do I earn the Featured Badge?",
    answer: "It is 100% merit-based. You must direct your past clients to your Vishwakarmans profile to leave a verified review. Once you collect enough positive reviews, click \"Request Evaluation\" in your Billing tab.",
  },
  {
    icon: MessageSquare,
    question: "How do clients leave a review?",
    answer: "Send them your profile link! They just need to create a free homeowner account, click \"Connect\" on your profile, and submit their rating.",
  },
  {
    icon: Users,
    question: "How do I receive client leads?",
    answer: "When a homeowner likes your portfolio, they will send a project inquiry containing their budget and requirements. These will appear directly in your Dashboard under the \"Inquiries\" tab.",
  },
  {
    icon: ShieldCheck,
    question: "How does the annual subscription work?",
    answer: "A flat yearly fee unlocks your premium workspace, allows you to upload unlimited portfolio projects, and lists you in our public directory for homeowners to find you. We take zero commissions on your projects.",
  },
  {
    icon: PauseCircle,
    question: "Can I cancel or pause my subscription?",
    answer: "Subscriptions are billed annually. If you choose not to renew, your profile will be hidden from the public directory at the end of your billing cycle, but your data will remain safely stored.",
  },
];

const Faqs = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 text-white py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent mb-2">
            <HelpCircle className="w-7 h-7" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-heading">
            Frequently Asked <span className="text-brand-accent">Questions</span>
          </h1>
          <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto font-light">
            Everything you need to know about the Vishwakarmans Designer Platform, leads, badges, and subscriptions.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4 pt-4">
          {faqsList.map((faq, idx) => {
            const IconComponent = faq.icon;
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 backdrop-blur-md"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-brand-accent/10 text-brand-accent flex-shrink-0">
                      <IconComponent size={20} />
                    </div>
                    <span className="text-base md:text-lg font-bold text-white font-heading">{faq.question}</span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 flex-shrink-0 ${
                      isOpen ? "rotate-180 text-brand-accent" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-2 text-gray-300 text-sm md:text-base leading-relaxed border-t border-white/5 font-sans">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Support Callout */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-gray-400">
            Have more questions or need personal assistance?
          </p>
          <Link
            to="/aboutcontact"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-accent hover:underline"
          >
            <Mail size={16} /> Contact Support Team
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Faqs;
