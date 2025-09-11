"use client";
import React, { useState, useMemo, use } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Calendar, TrendingUp, Eye, Heart, Users, Tag, Clock, MapPin, Zap } from 'lucide-react';

// Type definitions
interface CommonOffer {
    id: string;
    item_name: string;
    partner_id: string;
    partner_name: string;
    price: number;
    no_of_views: number;
    no_of_likes: number;
    created_at: string;
    coordinates?: string;
    district?: string;
    insta_link?: string;
    tags?: string | string[];
}

interface ViewedBy {
    id: string;
    user_id: string;
    created_at: string;
    common_offer: CommonOffer;
}

interface LikedBy {
    id: string;
    user_id: string;
    created_at: string;
    common_offer: CommonOffer;
}

interface HourlyData {
    hour: string;
    views: number;
}

interface LikesHourlyData {
    hour: string;
    likes: number;
}

interface TopViewer {
    userId: string;
    views: number;
}

interface PartnerStats {
    partner_name: string;
    reels_count: number;
    total_views: number;
    total_likes: number;
}

interface PopularTag {
    tag: string;
    count: number;
}

interface DistrictData {
    district: string;
    count: number;
}

interface DailyTrend {
    date: string;
    views: number;
    likes: number;
    reels: number;
}

interface Analytics {
    totalViews: number;
    totalLikes: number;
    totalReels: number;
    interactedReels: number;
    mostViewed: CommonOffer | null;
    mostLiked: CommonOffer | null;
    hourlyData: HourlyData[];
    likesHourlyData: LikesHourlyData[];
    topViewers: TopViewer[];
    topPartners: PartnerStats[];
    popularTags: PopularTag[];
    districtData: DistrictData[];
    dailyTrends: DailyTrend[];
    avgViewsPerReel: number;
    avgLikesPerReel: number;
}


const ReelAnalytics = ({ getCommonOffers }: {
    getCommonOffers: Promise<{ common_offers_liked_by: LikedBy[], common_offers_viewed_by: ViewedBy[], common_offers: CommonOffer[] }>
}) => {
    const data = use(getCommonOffers);
    const { common_offers_liked_by, common_offers_viewed_by, common_offers: offersWithNoInteraction } = data || {};

    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');

    // Helper function to filter interactions by date
    const filterInteractionsByDate = (interactions: (ViewedBy | LikedBy)[]): (ViewedBy | LikedBy)[] => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        return interactions.filter(interaction => {
            const interactionDate = new Date(interaction.created_at);
            
            switch (dateFilter) {
                case 'today':
                    return interactionDate >= today;
                case 'week':
                    return interactionDate >= thisWeek;
                case 'month':
                    return interactionDate >= thisMonth;
                case 'all':
                    return true;
                case 'custom':
                    if (customStartDate && customEndDate) {
                        const start = new Date(customStartDate);
                        const end = new Date(customEndDate);
                        end.setHours(23, 59, 59, 999);
                        return interactionDate >= start && interactionDate <= end;
                    }
                    return true;
                default:
                    return true;
            }
        });
    };

    // Helper function to filter reels by creation date
    const filterReelsByDate = (reels: CommonOffer[]): CommonOffer[] => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        return reels.filter(reel => {
            const reelDate = new Date(reel.created_at);
            
            switch (dateFilter) {
                case 'today':
                    return reelDate >= today;
                case 'week':
                    return reelDate >= thisWeek;
                case 'month':
                    return reelDate >= thisMonth;
                case 'all':
                    return true;
                case 'custom':
                    if (customStartDate && customEndDate) {
                        const start = new Date(customStartDate);
                        const end = new Date(customEndDate);
                        end.setHours(23, 59, 59, 999);
                        return reelDate >= start && reelDate <= end;
                    }
                    return true;
                default:
                    return true;
            }
        });
    };

   // Analytics calculations
const analytics = useMemo((): Analytics | null => {
    const filteredViews = filterInteractionsByDate(common_offers_viewed_by || []);
    const filteredLikes = filterInteractionsByDate(common_offers_liked_by || []);
    const filteredReels = filterReelsByDate(offersWithNoInteraction || []);

    if (!filteredViews.length && !filteredLikes.length && !filteredReels.length) {
        return null;
    }

    // Create a map to track all unique reels (both with and without interactions)
    const uniqueReels = new Map<string, CommonOffer>();
    
    // Add filtered reels first (created in the date range)
    filteredReels.forEach(offer => {
        uniqueReels.set(offer.id, {...offer, no_of_views: 0, no_of_likes: 0});
    });


    const reelViews: Record<string, number> = {};
    const reelLikes: Record<string, number> = {};

    // Aggregate views and likes per reel
    filteredViews.forEach(view => {
        const reelId = view.common_offer.id;
        if (!uniqueReels.has(reelId)) {
            uniqueReels.set(reelId, {...view.common_offer, no_of_views: 0, no_of_likes: 0});
        }
        reelViews[reelId] = (reelViews[reelId] || 0) + 1;
    });

    filteredLikes.forEach(like => {
        const reelId = like.common_offer.id;
        if (!uniqueReels.has(reelId)) {
            uniqueReels.set(reelId, {...like.common_offer, no_of_views: 0, no_of_likes: 0});
        }
        reelLikes[reelId] = (reelLikes[reelId] || 0) + 1;
    });

    // Update the reels with their actual view and like counts
    const aggregatedOffers = Array.from(uniqueReels.values()).map(offer => ({
        ...offer,
        no_of_views: reelViews[offer.id] || 0,
        no_of_likes: reelLikes[offer.id] || 0
    }));

    const totalViews = filteredViews.length;
    const totalLikes = filteredLikes.length;
    
    
    // Number of unique reels that have interactions
    const interactedReels = aggregatedOffers.filter(reel => reel.no_of_views > 0 || reel.no_of_likes > 0).length;
    // Total reels created in the date range
    const totalReels = filteredReels.length;
    
    // Most viewed and liked reels (might be reels with 0 interactions)
    const mostViewed = [...aggregatedOffers].sort((a, b) => b.no_of_views - a.no_of_views)[0] || null;
    const mostLiked = [...aggregatedOffers].sort((a, b) => b.no_of_likes - a.no_of_likes)[0] || null;

    // Views by hour
    const viewsByHour = Array(24).fill(0) as number[];
    filteredViews.forEach(view => {
        const hour = new Date(view.created_at).getHours();
        viewsByHour[hour]++;
    });

    const hourlyData: HourlyData[] = viewsByHour.map((count, hour) => ({
        hour: `${hour}:00`,
        views: count
    }));

    // Likes by hour
    const likesByHour = Array(24).fill(0) as number[];
    filteredLikes.forEach(like => {
        const hour = new Date(like.created_at).getHours();
        likesByHour[hour]++;
    });

    const likesHourlyData: LikesHourlyData[] = likesByHour.map((count, hour) => ({
        hour: `${hour}:00`,
        likes: count
    }));

    // User engagement
    const userViews: Record<string, number> = {};
    filteredViews.forEach(view => {
        userViews[view.user_id] = (userViews[view.user_id] || 0) + 1;
    });

    const topViewers: TopViewer[] = Object.entries(userViews)
        .map(([userId, count]) => ({ userId, views: count as number }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

    // Partner analytics - only include reels with partner_id
    const partnerStats: Record<string, PartnerStats> = {};
    aggregatedOffers.forEach(offer => {
        if (offer.partner_id) {
            if (!partnerStats[offer.partner_id]) {
                partnerStats[offer.partner_id] = {
                    partner_name: offer.partner_name || 'Unknown',
                    reels_count: 0,
                    total_views: 0,
                    total_likes: 0
                };
            }
            partnerStats[offer.partner_id].reels_count++;
            partnerStats[offer.partner_id].total_views += offer.no_of_views;
            partnerStats[offer.partner_id].total_likes += offer.no_of_likes;
        }
    });

    const topPartners: PartnerStats[] = Object.values(partnerStats)
        .sort((a, b) => b.reels_count - a.reels_count)
        .slice(0, 5);

    // Tag analysis
    const tagCounts: Record<string, number> = {};
    aggregatedOffers.forEach(offer => {
        if (offer.tags) {
            const tags = Array.isArray(offer.tags) ? offer.tags : offer.tags.split(',');
            tags.forEach(tag => {
                const cleanTag = tag.trim();
                if (cleanTag) {
                    tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
                }
            });
        }
    });

    const popularTags: PopularTag[] = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    // District analysis - only include reels created in the date range
    const districtStats: Record<string, number> = {};
    filteredReels.forEach(offer => {
        if (offer.district) {
            districtStats[offer.district] = (districtStats[offer.district] || 0) + 1;
        }
    });

    const districtData: DistrictData[] = Object.entries(districtStats)
        .map(([district, count]) => ({ district, count }))
        .sort((a, b) => b.count - a.count);

    // Daily trends
    const dailyStats: Record<string, { views: number; likes: number; reels: number }> = {};
    const trendDates = new Set<string>();

    filteredViews.forEach(view => {
        const date = new Date(view.created_at).toDateString();
        trendDates.add(date);
        if (!dailyStats[date]) {
            dailyStats[date] = { views: 0, likes: 0, reels: 0 };
        }
        dailyStats[date].views++;
    });
    
    filteredLikes.forEach(like => {
        const date = new Date(like.created_at).toDateString();
        trendDates.add(date);
        if (!dailyStats[date]) {
            dailyStats[date] = { views: 0, likes: 0, reels: 0 };
        }
        dailyStats[date].likes++;
    });
    
    // Include all reels created in the date range
    filteredReels.forEach(offer => {
        const date = new Date(offer.created_at).toDateString();
        trendDates.add(date);
        if (!dailyStats[date]) {
            dailyStats[date] = { views: 0, likes: 0, reels: 0 };
        }
        dailyStats[date].reels++;
    });

    const dailyTrends: DailyTrend[] = Array.from(trendDates)
        .map(dateStr => {
            const stats = dailyStats[dateStr] || { views: 0, likes: 0, reels: 0 };
            return {
                date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                ...stats
            };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
        totalViews,
        totalLikes,
        totalReels,
        interactedReels,
        mostViewed,
        mostLiked,
        hourlyData,
        likesHourlyData,
        topViewers,
        topPartners,
        popularTags,
        districtData,
        dailyTrends,
        avgViewsPerReel: Math.round(totalViews / totalReels) || 0,
        avgLikesPerReel: Math.round(totalLikes / totalReels) || 0
    };
}, [common_offers_viewed_by, common_offers_liked_by, offersWithNoInteraction, dateFilter, customStartDate, customEndDate]);

    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#87d068', '#ffc0cb'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">Reel Analytics Dashboard</h1>
                    <p className="text-gray-600">Comprehensive insights into your reel performance</p>
                </div>

                {/* Date Filter */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <div className="flex flex-wrap items-center gap-4">
                        <Calendar className="text-indigo-600" size={20} />
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setDateFilter('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    dateFilter === 'all' 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All Time
                            </button>
                            <button
                                onClick={() => setDateFilter('month')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    dateFilter === 'month' 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                This Month
                            </button>
                            <button
                                onClick={() => setDateFilter('week')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    dateFilter === 'week' 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                This Week
                            </button>
                            <button
                                onClick={() => setDateFilter('today')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    dateFilter === 'today' 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Today
                            </button>
                            <button
                                onClick={() => setDateFilter('custom')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    dateFilter === 'custom' 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Custom Range
                            </button>
                        </div>
                        {dateFilter === 'custom' && (
                            <div className="flex gap-2 items-center">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="px-3 py-2 border rounded-lg"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="px-3 py-2 border rounded-lg"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {!analytics ? (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                        <div className="text-gray-500 text-lg mb-4">No data available for the selected time period</div>
                        <p className="text-gray-400">Try selecting a different date range or check back later.</p>
                    </div>
                ) : (
                    <>
                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Total Views</p>
                                        <p className="text-3xl font-bold text-indigo-600">{analytics.totalViews.toLocaleString()}</p>
                                    </div>
                                    <Eye className="text-indigo-600" size={32} />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Total Likes</p>
                                        <p className="text-3xl font-bold text-pink-600">{analytics.totalLikes.toLocaleString()}</p>
                                    </div>
                                    <Heart className="text-pink-600" size={32} />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Total Reels Created</p>
                                        <p className="text-3xl font-bold text-green-600">{analytics.totalReels}</p>
                                    </div>
                                    <TrendingUp className="text-green-600" size={32} />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Reels with Interactions</p>
                                        <p className="text-3xl font-bold text-purple-600">{analytics.interactedReels}</p>
                                    </div>
                                    <Zap className="text-purple-600" size={32} />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Avg Views/Reel</p>
                                        <p className="text-3xl font-bold text-orange-600">{analytics.avgViewsPerReel === Infinity ? 0 : analytics.avgViewsPerReel}</p>
                                    </div>
                                    <Users className="text-orange-600" size={32} />
                                </div>
                            </div>
                        </div>

                        {/* Most Viewed and Liked */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Most Viewed Reel</h3>
                                {analytics.mostViewed && (
                                    <div className="space-y-3">
                                        <p className="font-semibold text-lg">{analytics.mostViewed.item_name}</p>
                                        <p className="text-gray-600">by {analytics.mostViewed.partner_name}</p>
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1 text-indigo-600">
                                                <Eye size={16} />
                                                {analytics.mostViewed.no_of_views} views
                                            </span>
                                            <span className="flex items-center gap-1 text-pink-600">
                                                <Heart size={16} />
                                                {analytics.mostViewed.no_of_likes} likes
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500">₹{analytics.mostViewed.price}</p>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Most Liked Reel</h3>
                                {analytics.mostLiked && (
                                    <div className="space-y-3">
                                        <p className="font-semibold text-lg">{analytics.mostLiked.item_name}</p>
                                        <p className="text-gray-600">by {analytics.mostLiked.partner_name}</p>
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1 text-indigo-600">
                                                <Eye size={16} />
                                                {analytics.mostLiked.no_of_views} views
                                            </span>
                                            <span className="flex items-center gap-1 text-pink-600">
                                                <Heart size={16} />
                                                {analytics.mostLiked.no_of_likes} likes
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500">₹{analytics.mostLiked.price}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hourly Analytics */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Views by Hour</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={analytics.hourlyData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="hour" />
                                        <YAxis />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="views" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Likes by Hour</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={analytics.likesHourlyData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="hour" />
                                        <YAxis />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="likes" stroke="#ec4899" fill="#ec4899" fillOpacity={0.3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Daily Trends */}
                        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Daily Trends</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={analytics.dailyTrends}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="views" stroke="#8884d8" strokeWidth={2} />
                                    <Line type="monotone" dataKey="likes" stroke="#ec4899" strokeWidth={2} />
                                    <Line type="monotone" dataKey="reels" stroke="#10b981" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Top Partners */}
                        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Top Partners by Reel Count</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analytics.topPartners}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="partner_name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="reels_count" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Popular Tags and Districts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Popular Tags</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={analytics.popularTags}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ tag, percent }: { tag: string; percent: number }) => `${tag} (${(percent * 100).toFixed(0)}%)`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="count"
                                        >
                                            {analytics.popularTags.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Reels by District</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={analytics.districtData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="district" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#10b981" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Viewers */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Top Viewers</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full table-auto">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-4">User ID</th>
                                            <th className="text-left py-3 px-4">Views</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analytics.topViewers.map((viewer, index) => (
                                            <tr key={viewer.userId} className="border-b hover:bg-gray-50">
                                                <td className="py-3 px-4">User #{viewer.userId}</td>
                                                <td className="py-3 px-4 font-semibold">{viewer.views}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ReelAnalytics;