import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Song, Lesson } from "@shared/schema";
import { Music, BookOpen, Guitar, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

type ContentItem = {
  id: number;
  type: 'song' | 'lesson';
  title: string;
  description: string;
  icon: 'music' | 'book' | 'guitar';
  badge: string;
  updatedAt: string;
};

export default function RecentContent() {
  const { user } = useAuth();
  const { data: songs } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
  });
  
  const { data: lessons } = useQuery<Lesson[]>({
    queryKey: ["/api/lessons"],
  });
  
  // Check if user is student - students shouldn't see this component
  const isStudent = user?.role === 'student';
  
  if (isStudent) {
    return null;
  }
  
  // Combine songs and lessons into a single array of content items
  const getContentItems = (): ContentItem[] => {
    const songItems: ContentItem[] = (songs || []).map(song => ({
      id: song.id,
      type: 'song',
      title: song.title,
      description: song.description || `${song.composer || 'Unknown'} - ${song.genre || 'Various'}`,
      icon: 'music',
      badge: 'Song Collection',
      updatedAt: new Date().toISOString(), // Using current date as mock since updatedAt isn't in schema
    }));
    
    const lessonItems: ContentItem[] = (lessons || []).map(lesson => ({
      id: lesson.id,
      type: 'lesson',
      title: lesson.title,
      description: lesson.description || `For ${lesson.instrument || 'all instruments'} (${lesson.level || 'all levels'})`,
      icon: lesson.contentType === 'theory' ? 'book' : 'guitar',
      badge: lesson.contentType === 'theory' ? 'Lesson Series' : 'Practice Material',
      updatedAt: new Date().toISOString(), // Using current date as mock since updatedAt isn't in schema
    }));
    
    return [...songItems, ...lessonItems]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  };
  
  const contentItems = getContentItems();
  
  const getIconComponent = (icon: string) => {
    switch (icon) {
      case 'music':
        return <Music className="text-white h-4 w-4" />;
      case 'book':
        return <BookOpen className="text-white h-4 w-4" />;
      case 'guitar':
        return <Guitar className="text-white h-4 w-4" />;
      default:
        return <Music className="text-white h-4 w-4" />;
    }
  };
  
  const getIconBgColor = (type: string) => {
    switch (type) {
      case 'song':
        return 'bg-primary';
      case 'lesson':
        return type === 'theory' ? 'bg-blue-500' : 'bg-amber-500';
      default:
        return 'bg-primary';
    }
  };
  
  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'Song Collection':
        return 'bg-blue-100 text-blue-800';
      case 'Lesson Series':
        return 'bg-purple-100 text-purple-800';
      case 'Practice Material':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <Card>
      <CardHeader className="px-4 py-5 border-b border-gray-200">
        <CardTitle className="text-lg font-medium text-gray-900">
          Recently Updated Content
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-5 sm:p-6">
        {contentItems.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500 mb-2">No content found</p>
            <div className="flex justify-center space-x-2">
              <Button variant="outline" size="sm">
                <Music className="h-4 w-4 mr-1" />
                Add Song
              </Button>
              <Button variant="outline" size="sm">
                <BookOpen className="h-4 w-4 mr-1" />
                Create Lesson
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contentItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className={`rounded p-2 ${getIconBgColor(item.type)}`}>
                    {getIconComponent(item.icon)}
                  </div>
                  <span className="text-xs text-gray-500">
                    Updated {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                  </span>
                </div>
                <h4 className="text-base font-medium text-gray-900 mb-1">{item.title}</h4>
                <p className="text-sm text-gray-500 mb-3">{item.description}</p>
                <div className="flex items-center justify-between">
                  <Badge className={getBadgeColor(item.badge)} variant="secondary">
                    {item.badge}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View details</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Assign to student</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t border-gray-200 px-4 py-4 sm:px-6">
        <Link href={contentItems[0]?.type === 'song' ? "/songs" : "/lessons"}>
          <a className="text-sm font-medium text-primary hover:text-primary-700">
            View all content<span className="sr-only"> content</span>
          </a>
        </Link>
      </CardFooter>
    </Card>
  );
}
