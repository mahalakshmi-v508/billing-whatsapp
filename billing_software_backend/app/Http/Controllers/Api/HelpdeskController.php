<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\TicketAttachment;
use App\Models\TicketComment;
use App\Models\TicketCommentAttachment;
use App\Models\TicketLog;
use App\Models\TicketNotification;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Carbon\Carbon;

class HelpdeskController extends Controller
{
    /**
     * 1. GET TICKETS LIST (With Search, Filters, Stats Summary & Pagination)
     */
    public function getTickets(Request $request)
    {
        try {
            $userRole = strtolower($request->header('X-User-Role') ?? $request->input('user_role', 'cashier'));
            $userId = $request->header('X-User-Id') ?? $request->input('user_id');

            $query = Ticket::with(['category', 'user', 'assignedUser', 'company']);

            // Customer / Cashier can only see their own tickets
            if (in_array($userRole, ['cashier', 'customer'])) {
                if ($userId) {
                    $query->where('user_id', $userId);
                }
            } elseif ($request->filled('filter_user_id')) {
                $query->where('user_id', $request->filter_user_id);
            }

            // Search filter (ticket_no, subject, description)
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('ticket_no', 'like', "%{$search}%")
                        ->orWhere('subject', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            }

            // Status filter
            if ($request->filled('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // Priority filter
            if ($request->filled('priority') && $request->priority !== 'all') {
                $query->where('priority', $request->priority);
            }

            // Category filter
            if ($request->filled('category_id') && $request->category_id !== 'all') {
                $query->where('category_id', $request->category_id);
            }

            // Assigned to filter
            if ($request->filled('assigned_to') && $request->assigned_to !== 'all') {
                $query->where('assigned_to', $request->assigned_to);
            }

            // Date Range Filter
            if ($request->filled('start_date') && $request->filled('end_date')) {
                $query->whereBetween('created_at', [
                    Carbon::parse($request->start_date)->startOfDay(),
                    Carbon::parse($request->end_date)->endOfDay()
                ]);
            }

            // Calculate Summary Counts for KPI cards
            $baseStatsQuery = Ticket::query();
            if (in_array($userRole, ['cashier', 'customer']) && $userId) {
                $baseStatsQuery->where('user_id', $userId);
            }

            $stats = [
                'total' => (clone $baseStatsQuery)->count(),
                'open' => (clone $baseStatsQuery)->where('status', 'open')->count(),
                'in_progress' => (clone $baseStatsQuery)->where('status', 'in_progress')->count(),
                'waiting_for_customer' => (clone $baseStatsQuery)->where('status', 'waiting_for_customer')->count(),
                'resolved' => (clone $baseStatsQuery)->where('status', 'resolved')->count(),
                'closed' => (clone $baseStatsQuery)->where('status', 'closed')->count(),
            ];

            // Sorting
            $sortBy = $request->input('sort_by', 'updated_at');
            $sortOrder = $request->input('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $perPage = (int) $request->input('per_page', 15);
            $tickets = $query->paginate($perPage);

            return response()->json([
                'status' => true,
                'stats' => $stats,
                'data' => $tickets->items(),
                'pagination' => [
                    'total' => $tickets->total(),
                    'per_page' => $tickets->perPage(),
                    'current_page' => $tickets->currentPage(),
                    'last_page' => $tickets->lastPage(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * 2. CREATE TICKET (With Attachments & Audit Log)
     */
    public function createTicket(Request $request)
    {
        DB::beginTransaction();
        try {
            $request->validate([
                'subject' => 'required|string|max:255',
                'description' => 'required|string',
                'user_id' => 'required',
                'category_id' => 'nullable',
                'priority' => 'nullable|in:low,medium,high,critical',
            ]);

            // Unique Ticket Number: e.g., TKT-20260722-1042
            $ticketNo = 'TKT-' . date('Ymd') . '-' . rand(1000, 9999);

            $ticket = Ticket::create([
                'ticket_no' => $ticketNo,
                'user_id' => $request->user_id,
                'company_id' => $request->company_id ?? null,
                'category_id' => $request->category_id ?? null,
                'subject' => $request->subject,
                'description' => $request->description,
                'priority' => $request->priority ?? 'medium',
                'status' => 'open',
            ]);

            // Handle Attachments (Upload to public/attachment folder)
            if ($request->hasFile('attachments')) {
                $uploadDir = public_path('attachment');
                if (!file_exists($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                foreach ($request->file('attachments') as $file) {
                    $originalName = $file->getClientOriginalName();
                    $extension = $file->getClientOriginalExtension();
                    $fileType = $file->getClientMimeType();
                    $fileSize = $file->getSize();

                    $filename = 'tkt_' . $ticket->id . '_' . time() . '_' . Str::random(6) . '.' . $extension;
                    $file->move($uploadDir, $filename);
                    $filePath = 'attachment/' . $filename;

                    TicketAttachment::create([
                        'ticket_id' => $ticket->id,
                        'user_id' => $request->user_id,
                        'filename' => $filename,
                        'original_name' => $originalName,
                        'file_path' => $filePath,
                        'file_type' => $fileType,
                        'file_size' => $fileSize,
                    ]);
                }
            }

            // Log Action in Audit History
            $this->logAction($ticket->id, $request->user_id, $request->user_name ?? 'User', $request->user_role ?? 'Customer', 'Created Ticket', null, "Created Ticket #{$ticketNo}");

            // Create Notifications for Admins/Support
            TicketNotification::create([
                'ticket_id' => $ticket->id,
                'user_id' => $request->user_id,
                'title' => 'New Ticket Created',
                'message' => "Ticket #{$ticketNo} '{$ticket->subject}' has been submitted.",
                'type' => 'ticket_created',
            ]);

            DB::commit();

            return response()->json([
                'status' => true,
                'message' => 'Ticket created successfully',
                'ticket' => $ticket->load(['category', 'attachments', 'user'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * 3. GET TICKET BY ID (Details, Comments, Attachments, Logs)
     */
    public function getTicketById($id, Request $request)
    {
        try {
            $userRole = strtolower($request->header('X-User-Role') ?? $request->input('user_role', 'cashier'));
            $userId = $request->header('X-User-Id') ?? $request->input('user_id');

            $ticket = Ticket::with([
                'category',
                'user',
                'assignedUser',
                'company',
                'attachments',
                'logs' => function ($q) {
                    $q->orderBy('created_at', 'desc');
                }
            ])->find($id);

            if (!$ticket) {
                return response()->json(['status' => false, 'message' => 'Ticket not found'], 404);
            }

            // Authorization: Customers can only view their own tickets
            if (in_array($userRole, ['cashier', 'customer']) && $userId && $ticket->user_id != $userId) {
                return response()->json(['status' => false, 'message' => 'Unauthorized access to this ticket'], 403);
            }

            // Comments query: filter out internal notes for customers
            $commentsQuery = TicketComment::with(['user', 'attachments'])->where('ticket_id', $id);
            if (in_array($userRole, ['cashier', 'customer'])) {
                $commentsQuery->where('is_internal', false);
            }
            $comments = $commentsQuery->orderBy('created_at', 'asc')->get();

            $ticketData = $ticket->toArray();
            $ticketData['comments'] = $comments;

            return response()->json([
                'status' => true,
                'data' => $ticketData
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * 4. UPDATE TICKET (Edit Subject, Category, Priority, Description)
     */
    public function updateTicket($id, Request $request)
    {
        DB::beginTransaction();
        try {
            $ticket = Ticket::find($id);
            if (!$ticket) {
                return response()->json(['status' => false, 'message' => 'Ticket not found'], 404);
            }

            $userRole = strtolower($request->input('user_role', 'cashier'));
            $userId = $request->input('user_id');

            // Customers cannot edit closed tickets
            if (in_array($userRole, ['cashier', 'customer']) && $ticket->status === 'closed') {
                return response()->json(['status' => false, 'message' => 'Closed tickets cannot be edited'], 422);
            }

            $oldSubject = $ticket->subject;
            $oldPriority = $ticket->priority;
            $oldCategory = $ticket->category_id;

            $ticket->update([
                'subject' => $request->subject ?? $ticket->subject,
                'category_id' => $request->category_id ?? $ticket->category_id,
                'priority' => $request->priority ?? $ticket->priority,
                'description' => $request->description ?? $ticket->description,
            ]);

            // Audit Logs
            if ($oldSubject !== $ticket->subject) {
                $this->logAction($id, $userId, $request->user_name, $userRole, 'Subject Edited', $oldSubject, $ticket->subject);
            }
            if ($oldPriority !== $ticket->priority) {
                $this->logAction($id, $userId, $request->user_name, $userRole, 'Priority Changed', $oldPriority, $ticket->priority);
            }
            if ($oldCategory !== $ticket->category_id) {
                $this->logAction($id, $userId, $request->user_name, $userRole, 'Category Changed', $oldCategory, $ticket->category_id);
            }

            DB::commit();
            return response()->json([
                'status' => true,
                'message' => 'Ticket updated successfully',
                'ticket' => $ticket->fresh(['category', 'user', 'assignedUser'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * 5. DELETE TICKET
     */
    public function deleteTicket($id, Request $request)
    {
        try {
            $ticket = Ticket::find($id);
            if (!$ticket) {
                return response()->json(['status' => false, 'message' => 'Ticket not found'], 404);
            }

            // Delete attachment files from public/attachment
            if ($ticket->attachments) {
                foreach ($ticket->attachments as $att) {
                    if ($att->filename && file_exists(public_path('attachment/' . $att->filename))) {
                        @unlink(public_path('attachment/' . $att->filename));
                    }
                }
            }

            $ticket->delete();
            return response()->json(['status' => true, 'message' => 'Ticket deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * 6. ADD COMMENT OR INTERNAL NOTE
     */
    public function addComment($id, Request $request)
    {
        DB::beginTransaction();
        try {
            $request->validate([
                'comment' => 'required|string',
                'user_id' => 'required',
            ]);

            $ticket = Ticket::find($id);
            if (!$ticket) {
                return response()->json(['status' => false, 'message' => 'Ticket not found'], 404);
            }

            $userRole = strtolower($request->input('user_role', 'cashier'));
            $isInternal = filter_var($request->input('is_internal', false), FILTER_VALIDATE_BOOLEAN);

            // Customers cannot post internal notes
            if (in_array($userRole, ['cashier', 'customer'])) {
                $isInternal = false;
            }

            $comment = TicketComment::create([
                'ticket_id' => $id,
                'user_id' => $request->user_id,
                'comment' => $request->comment,
                'is_internal' => $isInternal,
            ]);

            // Save Comment Attachments (Upload to public/attachment folder)
            if ($request->hasFile('attachments')) {
                $uploadDir = public_path('attachment');
                if (!file_exists($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                foreach ($request->file('attachments') as $file) {
                    $originalName = $file->getClientOriginalName();
                    $extension = $file->getClientOriginalExtension();
                    $fileType = $file->getClientMimeType();
                    $fileSize = $file->getSize();

                    $filename = 'comment_' . $comment->id . '_' . time() . '_' . Str::random(6) . '.' . $extension;
                    $file->move($uploadDir, $filename);
                    $filePath = 'attachment/' . $filename;

                    TicketCommentAttachment::create([
                        'comment_id' => $comment->id,
                        'user_id' => $request->user_id,
                        'filename' => $filename,
                        'original_name' => $originalName,
                        'file_path' => $filePath,
                        'file_type' => $fileType,
                        'file_size' => $fileSize,
                    ]);
                }
            }

            // AUTO STATUS TRANSITION: If customer replies while status is "waiting_for_customer", switch to "in_progress"
            if (in_array($userRole, ['cashier', 'customer']) && $ticket->status === 'waiting_for_customer') {
                $oldStatus = $ticket->status;
                $ticket->status = 'in_progress';
                $ticket->save();

                $this->logAction($id, $request->user_id, $request->user_name, $userRole, 'Status Auto-Changed', $oldStatus, 'in_progress');
            }

            // Audit log for comment
            $actionName = $isInternal ? 'Added Internal Note' : 'Added Comment';
            $this->logAction($id, $request->user_id, $request->user_name, $userRole, $actionName, null, Str::limit(strip_tags($request->comment), 50));

            // Notification
            TicketNotification::create([
                'ticket_id' => $id,
                'user_id' => $request->user_id,
                'title' => $isInternal ? 'New Internal Note' : 'New Comment Added',
                'message' => "{$request->user_name} posted a reply on Ticket #{$ticket->ticket_no}",
                'type' => 'comment_added',
            ]);

            DB::commit();

            return response()->json([
                'status' => true,
                'message' => 'Comment added successfully',
                'comment' => $comment->load(['user', 'attachments'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * 7. UPDATE TICKET STATUS
     */
    public function updateStatus($id, Request $request)
    {
        DB::beginTransaction();
        try {
            $userRole = strtolower($request->header('X-User-Role') ?? $request->input('user_role', ''));

            // Only Developer role can update status
            if ($userRole !== 'developer') {
                return response()->json([
                    'status' => false,
                    'message' => 'Only users with Developer role are authorized to update ticket status.'
                ], 403);
            }

            $request->validate([
                'status' => 'required|in:open,in_progress,waiting_for_customer,resolved,closed',
            ]);

            $ticket = Ticket::find($id);
            if (!$ticket) {
                return response()->json(['status' => false, 'message' => 'Ticket not found'], 404);
            }


            $oldStatus = $ticket->status;
            $newStatus = $request->status;

            $updateData = ['status' => $newStatus];

            if ($newStatus === 'closed' && $oldStatus !== 'closed') {
                $updateData['closed_at'] = now();
            } elseif ($oldStatus === 'closed' && $newStatus !== 'closed') {
                $updateData['reopened_at'] = now();
            }

            $ticket->update($updateData);

            // Audit Log
            $actionName = ($oldStatus === 'closed' && $newStatus !== 'closed') ? 'Reopened Ticket' : (($newStatus === 'closed') ? 'Closed Ticket' : 'Status Changed');
            $this->logAction($id, $request->user_id, $request->user_name, $request->user_role, $actionName, $oldStatus, $newStatus);

            // Notification
            TicketNotification::create([
                'ticket_id' => $id,
                'user_id' => $request->user_id ?? $ticket->user_id,
                'title' => 'Status Updated',
                'message' => "Ticket #{$ticket->ticket_no} status changed from '{$oldStatus}' to '{$newStatus}'",
                'type' => 'status_changed',
            ]);

            DB::commit();
            return response()->json([
                'status' => true,
                'message' => 'Ticket status updated successfully',
                'ticket' => $ticket->fresh(['category', 'user', 'assignedUser'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * 8. ASSIGN TICKET TO STAFF
     */
    public function assignTicket($id, Request $request)
    {
        DB::beginTransaction();
        try {
            $ticket = Ticket::find($id);
            if (!$ticket) {
                return response()->json(['status' => false, 'message' => 'Ticket not found'], 404);
            }

            $oldAssignedId = $ticket->assigned_to;
            $newAssignedId = $request->assigned_to;

            $assignedUser = User::find($newAssignedId);
            $assignedName = $assignedUser ? $assignedUser->name : 'Unassigned';

            $ticket->update([
                'assigned_to' => $newAssignedId,
                'assigned_at' => $newAssignedId ? now() : null,
            ]);

            // Audit Log
            $this->logAction($id, $request->user_id, $request->user_name, $request->user_role, 'Assigned User Changed', $oldAssignedId ? "User #{$oldAssignedId}" : 'Unassigned', $assignedName);

            // Notification for Assigned Staff
            if ($newAssignedId) {
                TicketNotification::create([
                    'ticket_id' => $id,
                    'user_id' => $newAssignedId,
                    'title' => 'Ticket Assigned',
                    'message' => "You have been assigned to Ticket #{$ticket->ticket_no} '{$ticket->subject}'",
                    'type' => 'ticket_assigned',
                ]);
            }

            DB::commit();
            return response()->json([
                'status' => true,
                'message' => 'Ticket assigned successfully',
                'ticket' => $ticket->fresh(['category', 'user', 'assignedUser'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * 9. GET AUDIT LOG TIMELINE
     */
    public function getLogs($id)
    {
        try {
            $logs = TicketLog::where('ticket_id', $id)->orderBy('created_at', 'desc')->get();
            return response()->json(['status' => true, 'data' => $logs]);
        } catch (\Exception $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * 10. GET CATEGORIES
     */
    public function getCategories()
    {
        try {
            $categories = TicketCategory::where('status', 'active')->orderBy('name', 'asc')->get();
            return response()->json(['status' => true, 'data' => $categories]);
        } catch (\Exception $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * 11. DASHBOARD ANALYTICS
     */
    public function getAnalytics(Request $request)
    {
        try {
            $userRole = strtolower($request->header('X-User-Role') ?? $request->input('user_role', 'cashier'));
            $userId = $request->header('X-User-Id') ?? $request->input('user_id');

            $query = Ticket::query();
            if (in_array($userRole, ['cashier', 'customer']) && $userId) {
                $query->where('user_id', $userId);
            }

            $totalTickets = (clone $query)->count();
            $openTickets = (clone $query)->where('status', 'open')->count();
            $inProgressTickets = (clone $query)->where('status', 'in_progress')->count();
            $waitingTickets = (clone $query)->where('status', 'waiting_for_customer')->count();
            $resolvedTickets = (clone $query)->where('status', 'resolved')->count();
            $closedTickets = (clone $query)->where('status', 'closed')->count();

            // Average Resolution Time (in Hours)
            $closedWithDates = (clone $query)->where('status', 'closed')->whereNotNull('closed_at')->get();
            $totalHours = 0;
            foreach ($closedWithDates as $t) {
                $created = Carbon::parse($t->created_at);
                $closed = Carbon::parse($t->closed_at);
                $totalHours += $created->diffInHours($closed);
            }
            $avgResolutionHours = $closedWithDates->count() > 0 ? round($totalHours / $closedWithDates->count(), 1) : 0;

            // Tickets by Category
            $byCategory = TicketCategory::withCount(['tickets' => function ($q) use ($userRole, $userId) {
                if (in_array($userRole, ['cashier', 'customer']) && $userId) {
                    $q->where('user_id', $userId);
                }
            }])->get()->map(function ($cat) {
                return [
                    'id' => $cat->id,
                    'name' => $cat->name,
                    'color' => $cat->color,
                    'count' => $cat->tickets_count
                ];
            });

            // Tickets by Priority
            $priorities = ['low', 'medium', 'high', 'critical'];
            $byPriority = [];
            foreach ($priorities as $p) {
                $byPriority[$p] = (clone $query)->where('priority', $p)->count();
            }

            // Monthly Trend (Last 6 Months)
            $monthlyTrend = [];
            for ($i = 5; $i >= 0; $i--) {
                $month = Carbon::now()->subMonths($i);
                $monthName = $month->format('M Y');
                $count = (clone $query)->whereYear('created_at', $month->year)
                    ->whereMonth('created_at', $month->month)
                    ->count();
                $monthlyTrend[] = [
                    'month' => $monthName,
                    'count' => $count
                ];
            }

            // Recent Audit Activity
            $recentLogs = TicketLog::orderBy('created_at', 'desc')->take(10)->get();

            return response()->json([
                'status' => true,
                'data' => [
                    'total_tickets' => $totalTickets,
                    'open_tickets' => $openTickets,
                    'in_progress_tickets' => $inProgressTickets,
                    'waiting_tickets' => $waitingTickets,
                    'resolved_tickets' => $resolvedTickets,
                    'closed_tickets' => $closedTickets,
                    'avg_resolution_hours' => $avgResolutionHours,
                    'by_category' => $byCategory,
                    'by_priority' => $byPriority,
                    'monthly_trend' => $monthlyTrend,
                    'recent_activities' => $recentLogs
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Helper to insert audit log
     */
    private function logAction($ticketId, $userId, $userName, $userRole, $action, $oldValue = null, $newValue = null)
    {
        try {
            TicketLog::create([
                'ticket_id' => $ticketId,
                'user_id' => $userId,
                'user_name' => $userName ?? 'System User',
                'user_role' => $userRole ?? 'Support',
                'action' => $action,
                'old_value' => $oldValue,
                'new_value' => $newValue,
                'ip_address' => request()->ip(),
                'user_agent' => request()->header('User-Agent'),
            ]);
        } catch (\Exception $e) {
            // Log error silently if log creation fails
        }
    }

    /**
     * Get staff/developer users for assignment dropdown
     */
    public function getStaffUsers()
    {
        try {
            $users = User::whereIn('role', ['developer', 'superadmin'])
                ->select('id', 'name', 'email', 'role', 'status')
                ->orderBy('name', 'asc')
                ->get();

            return response()->json([
                'status' => true,
                'data' => $users
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }
}

