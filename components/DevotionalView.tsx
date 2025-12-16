import React from 'react';
import Button from './Button';
import SocialActionBar from './SocialActionBar';

interface DevotionalViewProps {
  onBack: () => void;
  onSocialAction?: (action: 'like' | 'pray' | 'comment' | 'share') => void;
}

const DevotionalView: React.FC<DevotionalViewProps> = ({ onBack, onSocialAction }) => {
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col relative">
       {/* Hero Image */}
       <div className="h-64 md:h-80 w-full relative overflow-hidden">
          <img 
            src="https://image.pollinations.ai/prompt/majestic%20sunrise%20over%20mountains%20digital%20painting%20christian%20peaceful?width=1200&height=600&nologo=true" 
            alt="Sunrise"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-100 via-transparent to-black/30"></div>
          
          <div className="absolute top-20 left-4 z-10">
            <Button onClick={onBack} className="bg-white/20 hover:bg-white/30 backdrop-blur border-white/50 text-white">
               ← Home
            </Button>
          </div>
          
          <div className="absolute bottom-6 left-6 md:left-12">
             <div className="bg-yellow-500 text-yellow-900 font-bold px-3 py-1 text-xs tracking-wider uppercase inline-block mb-2 rounded-sm">
               Daily Devotional
             </div>
             <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 drop-shadow-sm">
               The Morning Armor
             </h1>
          </div>
       </div>

       {/* Content */}
       <div className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-12 -mt-10 relative z-10">
          <div className="bg-white p-8 md:p-12 rounded-lg shadow-xl border-t-4 border-yellow-500 mb-8">
             
             <div className="flex items-center gap-4 mb-8 border-b border-stone-200 pb-6">
                <div className="w-12 h-12 bg-stone-200 rounded-full flex items-center justify-center text-2xl">
                   ☀️
                </div>
                <div>
                   <p className="text-stone-500 text-sm font-serif italic">Today's Reading</p>
                   <p className="text-stone-900 font-bold">Ephesians 6:10-11</p>
                </div>
             </div>

             <blockquote className="text-xl md:text-2xl font-serif text-stone-800 leading-relaxed border-l-4 border-yellow-500 pl-6 mb-8 bg-stone-50 py-4 pr-4 rounded-r">
               "Finally, be strong in the Lord and in his mighty power. Put on the full armor of God, so that you can take your stand against the devil’s schemes."
             </blockquote>

             <div className="prose prose-stone prose-lg">
               <p>
                 The battles we face today are rarely just physical. They are battles of the mind, the heart, and the spirit. Waking up feels like stepping onto a battlefield where discouragement, anxiety, and apathy wait to ambush us.
               </p>
               <p>
                 But Paul reminds us that we do not walk out uncovered. The strength we need is not our own—it is "in the Lord." This is a relief! You don't have to manufacture courage this morning. You simply need to put on what He has already provided.
               </p>
               <p>
                 Today, visualize yourself putting on that armor. Truth to guard your core. Righteousness to protect your heart. Peace to steady your feet. Faith to extinguish the sudden arrows of doubt.
               </p>
             </div>

             <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="text-blue-900 font-bold mb-2 uppercase tracking-wide text-sm">Prayer for Today</h3>
                <p className="text-blue-800 font-serif italic">
                  "Lord, I cannot fight today's battles in my own strength. I put on Your armor now. Cover my mind with Your salvation and my heart with Your righteousness. Help me stand firm. Amen."
                </p>
             </div>
             
             <div className="mt-8 text-center">
               <Button className="w-full md:w-auto">Mark as Read</Button>
             </div>
          </div>
          
          {/* Social Engagement */}
          {onSocialAction && (
             <SocialActionBar 
                onInteract={onSocialAction} 
                entityName="Daily Devotional" 
             />
          )}
       </div>
    </div>
  );
};

export default DevotionalView;