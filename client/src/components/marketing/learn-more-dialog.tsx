import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Check, 
  Calendar, 
  Trophy, 
  Music, 
  Users, 
  BarChart, 
  CreditCard, 
  PlayCircle, 
  MessageCircle, 
  Clock, 
  Star, 
  ArrowRight, 
  Shield, 
  Zap, 
  Target, 
  Smartphone, 
  ChevronRight, 
  TrendingUp, 
  Award, 
  BookOpen, 
  Brain, 
  DollarSign, 
  UserCheck, 
  CheckCircle2, 
  AlertTriangle,
  HeadphonesIcon,
  GraduationCap,
  FileText,
  Settings
} from "lucide-react";
import musicdottLogo from "../../assets/musicdott-logo.png";

export default function LearnMoreDialog({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-0 border-0 bg-white">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform rotate-12"></div>
          </div>
          <div className="relative px-8 py-16 text-center">
            <div className="flex justify-center mb-8">
              <div className="relative p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <img src={musicdottLogo} alt="Musicdott Logo" className="h-16 w-auto" />
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                  2025
                </div>
              </div>
            </div>
            
            <h1 className="text-6xl font-black tracking-tight mb-6 leading-tight">
              Finally, a Music School Platform That{" "}
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Understands Your Reality
              </span>
            </h1>
            
            <p className="text-xl text-blue-100 max-w-4xl mx-auto leading-relaxed mb-12">
              Musicdott helps music schools streamline their planning, communication and student follow-up — 
              so teachers can focus on teaching, and students can grow with structure and clarity.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 border-0">
                <PlayCircle className="mr-3 h-6 w-6" />
                Book a Free Demo — See how it works in 15 minutes
              </Button>
              <div className="flex items-center gap-2 text-blue-200 text-sm">
                <Shield className="h-4 w-4" />
                No commitment • Setup assistance included
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-0">
          
          {/* The Real Struggle Section */}
          <section className="px-8 py-20 bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-6">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-5xl font-bold text-gray-900 mb-6">The Real Day-to-Day Struggle</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  Running a music school means juggling dozens of moving parts.
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8 mb-16">
                <div className="group p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                  <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                    <Calendar className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Timetables & Cancellations</h3>
                  <p className="text-gray-600">Endless scheduling conflicts and last-minute changes</p>
                </div>
                <div className="group p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                  <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                    <CreditCard className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Missed Payments</h3>
                  <p className="text-gray-600">Chasing payments and managing finances manually</p>
                </div>
                <div className="group p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                  <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                    <MessageCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Parent Messages</h3>
                  <p className="text-gray-600">Scattered communication across multiple platforms</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-3xl p-12 border border-red-100">
                <div className="max-w-4xl mx-auto text-center">
                  <p className="text-2xl text-gray-800 mb-8 font-medium">All of it eats into your time, your focus, and your team's energy.</p>
                  <h3 className="text-3xl font-bold text-gray-900 mb-8">And the result?</h3>
                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm">
                      <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                      <span className="text-lg font-medium text-gray-800">Teachers feel overwhelmed</span>
                    </div>
                    <div className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm">
                      <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                      <span className="text-lg font-medium text-gray-800">Parents feel uninformed</span>
                    </div>
                    <div className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm">
                      <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                      <span className="text-lg font-medium text-gray-800">Students lose motivation</span>
                    </div>
                  </div>
                  <p className="text-xl font-semibold text-gray-900">
                    This isn't about working harder — it's about needing a better system.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Designed by Music Educators */}
          <section className="px-8 py-20 bg-white">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-6">
                  <GraduationCap className="h-8 w-8 text-orange-600" />
                </div>
                <h2 className="text-5xl font-bold text-gray-900 mb-6">Designed by Music Educators</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  Musicdott was built by real teachers and school owners who've felt this exact pressure.
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-3xl p-12 border border-orange-100">
                <div className="max-w-4xl mx-auto">
                  <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">We know what it's like to:</h3>
                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm">
                      <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-xl flex-shrink-0">
                        <Smartphone className="h-5 w-5 text-orange-600" />
                      </div>
                      <span className="text-lg font-medium text-gray-800">chase WhatsApp messages at night</span>
                    </div>
                    <div className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm">
                      <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-xl flex-shrink-0">
                        <Calendar className="h-5 w-5 text-orange-600" />
                      </div>
                      <span className="text-lg font-medium text-gray-800">fix last-minute schedule conflicts</span>
                    </div>
                    <div className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm">
                      <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-xl flex-shrink-0">
                        <Users className="h-5 w-5 text-orange-600" />
                      </div>
                      <span className="text-lg font-medium text-gray-800">manage dozens of students without clear overview</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900 leading-relaxed">
                      That's why we created one place to bring everything together — clear, secure, and actually designed for music education.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* What You Can Do With Musicdott */}
          <section className="px-8 py-20 bg-gradient-to-b from-emerald-50 to-green-50">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-6">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-5xl font-bold text-gray-900 mb-6">What You Can Do With Musicdott</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  A central hub for everything your school needs — no workarounds, no extra tools.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="space-y-6">
                  <div className="group flex items-start gap-4 p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Calendar className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Plan and manage lessons across multiple teachers</h3>
                      <p className="text-gray-600">Centralized scheduling and resource allocation</p>
                    </div>
                  </div>
                  <div className="group flex items-start gap-4 p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Music className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Share exercises, recordings and feedback with students</h3>
                      <p className="text-gray-600">Rich multimedia content and progress tracking</p>
                    </div>
                  </div>
                  <div className="group flex items-start gap-4 p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Track progress over time</h3>
                      <p className="text-gray-600">Visual analytics and achievement systems</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="group flex items-start gap-4 p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      <MessageCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Communicate clearly with students and parents</h3>
                      <p className="text-gray-600">Integrated messaging and notification system</p>
                    </div>
                  </div>
                  <div className="group flex items-start gap-4 p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      <BookOpen className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Organise your material library (songs, books, tools)</h3>
                      <p className="text-gray-600">Searchable content repository with tagging</p>
                    </div>
                  </div>
                  <div className="group flex items-start gap-4 p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Users className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Keep your whole school in sync — without chaos</h3>
                      <p className="text-gray-600">Real-time collaboration and updates</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-3xl p-12 border border-emerald-100 text-center">
                <p className="text-2xl font-semibold text-gray-900 leading-relaxed">
                  Everything is built with simplicity in mind. No learning curve. No unnecessary features.
                </p>
              </div>
            </div>
          </section>

          {/* Simple 3-Step Start */}
          <section className="px-8 py-20 bg-white">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-6">
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-5xl font-bold text-gray-900 mb-6">A Simple 3-Step Start</h2>
              </div>
              
              <div className="relative">
                {/* Connection Line */}
                <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200"></div>
                
                <div className="grid md:grid-cols-3 gap-12 relative">
                  <div className="text-center group">
                    <div className="relative mb-8">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto shadow-xl group-hover:scale-110 transition-transform duration-300">
                        1
                      </div>
                      <div className="absolute -inset-2 bg-blue-100 rounded-2xl -z-10 group-hover:scale-105 transition-transform duration-300"></div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Book your free demo</h3>
                    <p className="text-lg text-gray-600 leading-relaxed">We show you how Musicdott works and answer any questions.</p>
                  </div>
                  
                  <div className="text-center group">
                    <div className="relative mb-8">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto shadow-xl group-hover:scale-110 transition-transform duration-300">
                        2
                      </div>
                      <div className="absolute -inset-2 bg-blue-100 rounded-2xl -z-10 group-hover:scale-105 transition-transform duration-300"></div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Set up your school</h3>
                    <p className="text-lg text-gray-600 leading-relaxed">We help you import your students and customise your setup.</p>
                  </div>
                  
                  <div className="text-center group">
                    <div className="relative mb-8">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto shadow-xl group-hover:scale-110 transition-transform duration-300">
                        3
                      </div>
                      <div className="absolute -inset-2 bg-blue-100 rounded-2xl -z-10 group-hover:scale-105 transition-transform duration-300"></div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Start teaching, stress-free</h3>
                    <p className="text-lg text-gray-600 leading-relaxed">Enjoy a clear workflow — for you, your team, and your students.</p>
                  </div>
                </div>
              </div>

              <div className="text-center mt-16">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-10 py-5 text-xl font-semibold rounded-2xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105">
                  Book Your Free Demo
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="px-8 py-20 bg-gradient-to-b from-slate-50 to-gray-50">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-2xl mb-6">
                  <Star className="h-8 w-8 text-yellow-600" />
                </div>
                <h2 className="text-5xl font-bold text-gray-900 mb-6">What Our Users Say</h2>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                    "It instantly made our school calmer. Teachers know what's happening. Students are more engaged. And I finally have time again."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                      H
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Head of Music School</p>
                      <p className="text-sm text-gray-600">Belgium</p>
                    </div>
                  </div>
                </div>
                
                <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                    "The progress tracking made a huge difference. Students can see their own development, and parents feel involved."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      P
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Piano Teacher</p>
                      <p className="text-sm text-gray-600">Netherlands</p>
                    </div>
                  </div>
                </div>
                
                <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                    "We tried other tools, but they were always generic. Musicdott is made for what we do. You feel it immediately."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold">
                      D
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Director</p>
                      <p className="text-sm text-gray-600">Modern Music Institute</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-xl text-gray-700 font-medium mb-8">Want to see how it works in your school?</p>
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-10 py-5 text-xl font-semibold rounded-2xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105">
                  Book a Free Demo
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="px-8 py-20 bg-white">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-2xl mb-6">
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
                <h2 className="text-5xl font-bold text-gray-900 mb-6">Pricing (simple, transparent)</h2>
                <p className="text-xl text-gray-600">No hidden fees. No contracts. You pay for what you use.</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
                <div className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-purple-200 relative">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Standard Plan</h3>
                    <div className="mb-6">
                      <span className="text-5xl font-black text-purple-600">€29</span>
                      <span className="text-2xl font-semibold text-gray-500">,95</span>
                      <p className="text-gray-600 mt-2">per month</p>
                    </div>
                    <div className="space-y-2 mb-8">
                      <p className="text-gray-700">Up to 10 teachers & 25 students</p>
                      <p className="text-gray-700">All features included</p>
                    </div>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg font-semibold rounded-xl">
                      Get Started
                    </Button>
                  </div>
                </div>
                
                <div className="group bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 relative transform hover:scale-105">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-6 py-2 text-sm font-bold">
                      Most Popular
                    </Badge>
                  </div>
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold mb-4">Pro Plan</h3>
                    <div className="mb-6">
                      <span className="text-5xl font-black">€49</span>
                      <span className="text-2xl font-semibold text-purple-200">,95</span>
                      <p className="text-purple-200 mt-2">per month</p>
                    </div>
                    <div className="space-y-2 mb-8">
                      <p className="text-purple-100">Unlimited teachers</p>
                      <p className="text-purple-100">Includes 50 students</p>
                      <p className="text-purple-100">€4,50 per 5 additional students</p>
                    </div>
                    <Button className="w-full bg-white text-purple-600 hover:bg-gray-100 py-3 text-lg font-semibold rounded-xl">
                      Start Free Trial
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-3xl p-12 border border-purple-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Everything Included:</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-xl flex-shrink-0">
                      <Check className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-lg font-medium text-gray-800">Unlimited content</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-xl flex-shrink-0">
                      <Check className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-lg font-medium text-gray-800">All integrations (YouTube, Spotify, etc.)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-xl flex-shrink-0">
                      <Check className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-lg font-medium text-gray-800">Full support</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="px-8 py-20 bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-6">
                  <FileText className="h-8 w-8 text-gray-600" />
                </div>
                <h2 className="text-5xl font-bold text-gray-900 mb-6">FAQ</h2>
              </div>
              
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Can I try Musicdott without paying?</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">Yes — book a free demo or request a test account.</p>
                </div>
                
                <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Is this only for drum schools?</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">No. Musicdott is used by schools with piano, vocals, guitar, wind instruments and more.</p>
                </div>
                
                <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Is the platform GDPR compliant?</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">Yes. All data is securely stored in Europe and managed with full compliance.</p>
                </div>
                
                <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Can I cancel anytime?</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">Of course. No contracts, no fuss.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Closing CTA */}
          <section className="px-8 py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform rotate-12"></div>
            </div>
            <div className="relative max-w-4xl mx-auto text-center">
              <h2 className="text-6xl font-black mb-8 leading-tight">
                Take the chaos out of your school.
              </h2>
              <p className="text-2xl mb-12 max-w-3xl mx-auto leading-relaxed text-blue-100">
                Give yourself, your teachers, and your students the clarity they need.
              </p>
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white px-12 py-6 text-xl font-semibold rounded-2xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 border-0">
                <PlayCircle className="mr-3 h-7 w-7" />
                Book Your Free Demo — We'll show you exactly how it can work for you
              </Button>
              <div className="flex items-center justify-center gap-2 text-blue-200 text-sm mt-6">
                <Shield className="h-4 w-4" />
                15-minute demo • No commitment • Setup assistance included
              </div>
            </div>
          </section>

        </div>
      </DialogContent>
    </Dialog>
  );
}