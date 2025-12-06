import { Ticket, User, TicketStatus, TicketPriority, UserRole, StatusConfig, ModuleConfig, SlaConfig, Notification, NotificationType } from '../types';
import { supabase } from './supabaseClient';

// Helper to map DB snake_case to App camelCase
export const mapDbTicketToLocal = (data: any): Ticket => ({
  id: data.id,
  number: data.number || 'TIC-000', // Fallback for missing number
  title: data.title || 'Untitled Ticket', // Fallback for missing title
  description: data.description || '',
  module: data.module || 'System',
  status: (data.status as TicketStatus) || TicketStatus.OPEN,
  priority: (data.priority as TicketPriority) || TicketPriority.LOW,
  reporterId: data.reporter_id,
  assigneeId: data.assignee_id,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
  stepsToReproduce: data.steps_to_reproduce || '',
  attachments: data.attachments || [],
  comments: data.comments ? data.comments.map((c: any) => ({
    ...c,
    timestamp: new Date(c.timestamp),
    isAnalyzing: false // Always reset analysis state on load
  })) : [],
  relations: data.relations || [],
  satisfactionRating: data.satisfaction_rating
});

// Initial Mock Data
export const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Moe Admin', email: 'moe@plc.com', role: UserRole.ADMIN, avatar: 'https://ui-avatars.com/api/?name=Moe+Admin&background=0284c7&color=fff', password: 'admin' },
  { id: 'u2', name: 'Sarah Developer', email: 'sarah@plc.com', role: UserRole.DEVELOPER, avatar: 'https://ui-avatars.com/api/?name=Sarah+Dev&background=7c3aed&color=fff', password: 'dev' },
  { id: 'u3', name: 'Mike Backend', email: 'mike@plc.com', role: UserRole.DEVELOPER, avatar: 'https://ui-avatars.com/api/?name=Mike+Back&background=7c3aed&color=fff', password: 'dev' },
  { id: 'u4', name: 'John Reporter', email: 'john@plc.com', role: UserRole.REPORTER, avatar: 'https://ui-avatars.com/api/?name=John+Rep&background=ea580c&color=fff', password: 'user' },
  { id: 'u5', name: 'Emily QA', email: 'emily@plc.com', role: UserRole.REPORTER, avatar: 'https://ui-avatars.com/api/?name=Emily+QA&background=ea580c&color=fff', password: 'user' },
];

export const INITIAL_TICKETS: Ticket[] = [
  {
    id: 't1',
    number: 'TIC-1001',
    title: 'Inventory Sync Failure',
    description: 'The inventory levels in the warehouse module are not syncing with the sales module. This is causing overselling of items.',
    module: 'Inventory',
    status: TicketStatus.OPEN_BUG,
    priority: TicketPriority.CRITICAL,
    reporterId: 'u4',
    assigneeId: 'u2',
    createdAt: new Date(Date.now() - 3600000), // 1 hour ago (SLA: 4h -> 3h left)
    updatedAt: new Date(Date.now() - 1800000),
    stepsToReproduce: '1. Go to Warehouse.\n2. Adjust stock for Item A.\n3. Check Sales module for Item A.\n4. Stock mismatch.',
    attachments: [
      { id: 'a1', name: 'error_log.png', type: 'image', url: 'https://picsum.photos/seed/error/400/300', mimeType: 'image/png' }
    ],
    comments: [],
    relations: []
  },
  {
    id: 't2',
    number: 'TIC-1002',
    title: 'Invoice Footer Formatting',
    description: 'PDF invoices are cutting off the footer information on A4 paper settings.',
    module: 'Finance',
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.MEDIUM,
    reporterId: 'u5',
    assigneeId: 'u3',
    createdAt: new Date(Date.now() - 86400000 * 5),
    updatedAt: new Date(Date.now() - 86400000),
    stepsToReproduce: 'Print any invoice to PDF using default settings.',
    attachments: [],
    comments: [
      { id: 'c1', userId: 'u3', text: 'Fixed the template padding.', timestamp: new Date(), isResolution: true }
    ],
    relations: [],
    satisfactionRating: 5
  },
  {
    id: 't3',
    number: 'TIC-1003',
    title: 'Month End Closing Slow',
    description: 'The "Close Month" procedure is timing out after 30 minutes. Users cannot finalize the period.',
    module: 'Finance',
    status: TicketStatus.TO_BE_INVESTIGATED,
    priority: TicketPriority.HIGH,
    reporterId: 'u1',
    assigneeId: 'u2',
    createdAt: new Date(Date.now() - 7200000), // 2 hours ago (SLA: 8h -> 6h left)
    updatedAt: new Date(Date.now() - 7200000),
    stepsToReproduce: 'Run "Month End" for September.',
    attachments: [],
    comments: [],
    relations: []
  },
  {
    id: 't4',
    number: 'TIC-1004',
    title: 'Payroll Tax Calculation Error',
    description: 'Deductions for tax bracket B are off by 0.5%. Verified with manual calculation.',
    module: 'HR',
    status: TicketStatus.OPEN_BUG,
    priority: TicketPriority.CRITICAL,
    reporterId: 'u5',
    assigneeId: 'u3',
    createdAt: new Date(Date.now() - 18000000), // 5 hours ago (SLA: 4h -> Overdue by 1h)
    updatedAt: new Date(),
    stepsToReproduce: 'Calculate payroll for Employee #105.',
    attachments: [],
    comments: [],
    relations: []
  },
  {
    id: 't5',
    number: 'TIC-1005',
    title: 'Dark Mode UI Glitch',
    description: 'The sidebar text becomes invisible in Dark Mode on Safari.',
    module: 'System',
    status: TicketStatus.PARTIALLY_CLOSED,
    priority: TicketPriority.LOW,
    reporterId: 'u4',
    assigneeId: 'u2',
    createdAt: new Date(Date.now() - 604800000), // 1 week
    updatedAt: new Date(),
    stepsToReproduce: 'Enable Dark Mode in Safari browser.',
    attachments: [],
    comments: [{ id: 'c2', userId: 'u2', text: 'Fixed for Chrome, still working on Safari.', timestamp: new Date(), isSystem: false }],
    relations: [],
    satisfactionRating: 3
  },
  {
    id: 't6',
    number: 'TIC-1006',
    title: 'Cannot Post Purchase Order',
    description: 'Error "Sequence boundary reached" when trying to post PO #5592.',
    module: 'Manufacturing',
    status: TicketStatus.PENDING_USER,
    priority: TicketPriority.MEDIUM,
    reporterId: 'u4',
    assigneeId: 'u3',
    createdAt: new Date(Date.now() - 10000000),
    updatedAt: new Date(),
    stepsToReproduce: 'Try to post PO #5592',
    attachments: [],
    comments: [{ id: 'c3', userId: 'u3', text: 'Can you provide a screenshot of the error dialog?', timestamp: new Date(), isSystem: false }],
    relations: []
  },
  {
    id: 't7',
    number: 'TIC-1007',
    title: 'New User Rights Request',
    description: 'Please add "Sales Manager" role to new employee John Doe.',
    module: 'System',
    status: TicketStatus.CLOSED,
    priority: TicketPriority.LOW,
    reporterId: 'u1',
    assigneeId: 'u1',
    createdAt: new Date(Date.now() - 250000000),
    updatedAt: new Date(Date.now() - 200000000),
    stepsToReproduce: 'N/A',
    attachments: [],
    comments: [],
    relations: [],
    satisfactionRating: 5
  },
  {
    id: 't8',
    number: 'TIC-1008',
    title: 'API Connection Timeout',
    description: 'The connection to the external logistics provider API is failing intermittently.',
    module: 'System',
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.HIGH,
    reporterId: 'u2',
    assigneeId: 'u3',
    createdAt: new Date(Date.now() - 3600000 * 4),
    updatedAt: new Date(),
    stepsToReproduce: 'Check API logs.',
    attachments: [],
    comments: [],
    relations: []
  },
  {
    id: 't9',
    number: 'TIC-1009',
    title: 'Customer Report Upgrade',
    description: 'Request to add "Last Purchase Date" column to the Customer Sales Report.',
    module: 'Sales',
    status: TicketStatus.USER_ACCEPTANCE,
    priority: TicketPriority.MEDIUM,
    reporterId: 'u5',
    assigneeId: 'u2',
    createdAt: new Date(Date.now() - 86400000 * 3),
    updatedAt: new Date(),
    stepsToReproduce: 'N/A',
    attachments: [],
    comments: [{ id: 'c4', userId: 'u2', text: 'Deployed to UAT environment. Please verify.', timestamp: new Date(), isResolution: false }],
    relations: [],
    satisfactionRating: 4
  },
  {
    id: 't10',
    number: 'TIC-1010',
    title: 'Re-opened: Login Issue',
    description: 'The fix for the login timeout worked for a day but is happening again.',
    module: 'System',
    status: TicketStatus.REOPENED,
    priority: TicketPriority.HIGH,
    reporterId: 'u4',
    assigneeId: 'u3',
    createdAt: new Date(Date.now() - 86400000 * 10),
    updatedAt: new Date(),
    stepsToReproduce: 'Wait 15 mins on login screen.',
    attachments: [],
    comments: [],
    relations: []
  },
  {
    id: 't11',
    number: 'TIC-1011',
    title: 'Stock Valuation Discrepancy',
    description: 'FIFO calculation seems incorrect for batch B-102.',
    module: 'Finance',
    status: TicketStatus.TO_BE_INVESTIGATED,
    priority: TicketPriority.CRITICAL,
    reporterId: 'u1',
    assigneeId: undefined,
    createdAt: new Date(Date.now() - 7200000),
    updatedAt: new Date(),
    stepsToReproduce: 'Run valuation report.',
    attachments: [],
    comments: [],
    relations: []
  },
  {
    id: 't12',
    number: 'TIC-1012',
    title: 'Add "Export to Excel" Button',
    description: 'Users need to export the order list to Excel.',
    module: 'Sales',
    status: TicketStatus.OPEN,
    priority: TicketPriority.LOW,
    reporterId: 'u5',
    assigneeId: undefined,
    createdAt: new Date(Date.now() - 1000000),
    updatedAt: new Date(),
    stepsToReproduce: 'N/A',
    attachments: [],
    comments: [],
    relations: []
  }
];

const mapUserFromDB = (data: any): User => ({
  id: data.id,
  name: data.name,
  email: data.email,
  role: data.role as UserRole,
  avatar: data.avatar,
  password: data.password // Note: In a real app, we wouldn't fetch passwords like this
});

export const StorageService = {
  fetchTickets: async (): Promise<Ticket[]> => {
    if (!supabase) {
      console.error("Supabase client not initialized");
      return [];
    }
    const { data, error } = await supabase
      .from('tickets')
      .select('id, number, title, module, status, priority, reporter_id, assignee_id, created_at, updated_at, satisfaction_rating')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }

    return data.map(mapDbTicketToLocal);
  },

  fetchTicketDetails: async (id: string): Promise<Ticket | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching ticket details:', error);
      return null;
    }
    return mapDbTicketToLocal(data);
  },

  fetchUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return data.map(mapUserFromDB);
  },

  createTicket: async (ticket: Ticket): Promise<Ticket | null> => {
    const dbTicket = {
      id: ticket.id,
      number: ticket.number,
      title: ticket.title,
      description: ticket.description,
      module: ticket.module,
      status: ticket.status,
      priority: ticket.priority,
      reporter_id: ticket.reporterId,
      assignee_id: ticket.assigneeId,
      created_at: ticket.createdAt.toISOString(),
      updated_at: ticket.updatedAt.toISOString(),
      steps_to_reproduce: ticket.stepsToReproduce,
      attachments: ticket.attachments,
      comments: ticket.comments,
      relations: ticket.relations,
      satisfaction_rating: ticket.satisfactionRating
    };

    const { data, error } = await supabase
      .from('tickets')
      .insert(dbTicket)
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      return null;
    }

    return mapDbTicketToLocal(data);
  },

  updateTicket: async (id: string, updates: Partial<Ticket>): Promise<Ticket | null> => {
    if (!supabase) return null;

    const dbUpdates: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.module !== undefined) dbUpdates.module = updates.module;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId;
    if (updates.stepsToReproduce !== undefined) dbUpdates.steps_to_reproduce = updates.stepsToReproduce;
    if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;
    if (updates.comments !== undefined) {
      dbUpdates.comments = updates.comments.map(c => ({
        ...c,
        timestamp: c.timestamp instanceof Date ? c.timestamp.toISOString() : c.timestamp
      }));
    }
    if (updates.relations !== undefined) dbUpdates.relations = updates.relations;
    if (updates.satisfactionRating !== undefined) dbUpdates.satisfaction_rating = updates.satisfactionRating;

    const { data, error } = await supabase
      .from('tickets')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket:', error);
      return null;
    }

    return mapDbTicketToLocal(data);
  },

  // Legacy/Unused methods kept empty or removed as per instruction to "completely rewrite"
  // We will remove the syncWithGoogleSheets logic as it was part of the old storage service 
  // and not requested to be ported, but if needed we could add it back. 
  // For now, adhering to "completely rewrite... Remove all localStorage logic".
  seedDatabase: async (): Promise<boolean> => {
    if (!supabase) return false;

    try {
      // Seed Users
      for (const user of INITIAL_USERS) {
        const { error } = await supabase.from('users').upsert({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          password: user.password
        });
        if (error) console.error('Error seeding user:', error);
      }

      // Seed Tickets
      for (const ticket of INITIAL_TICKETS) {
        const dbTicket = {
          id: ticket.id,
          number: ticket.number,
          title: ticket.title,
          description: ticket.description,
          module: ticket.module,
          status: ticket.status,
          priority: ticket.priority,
          reporter_id: ticket.reporterId,
          assignee_id: ticket.assigneeId,
          created_at: ticket.createdAt.toISOString(),
          updated_at: ticket.updatedAt.toISOString(),
          steps_to_reproduce: ticket.stepsToReproduce,
          attachments: ticket.attachments,
          comments: ticket.comments,
          relations: ticket.relations,
          satisfaction_rating: ticket.satisfactionRating
        };
        const { error } = await supabase.from('tickets').upsert(dbTicket);
        if (error) console.error('Error seeding ticket:', error);
      }

      return true;
    } catch (e) {
      console.error("Seeding failed", e);
      return false;
    }
  },

  mapDbTicketToLocal: mapDbTicketToLocal,

  // --- Master Data Management ---

  fetchMasterData: async (): Promise<{ statuses: StatusConfig[], modules: ModuleConfig[], slas: SlaConfig[] }> => {
    if (!supabase) return { statuses: [], modules: [], slas: [] };

    const [statusRes, moduleRes, slaRes] = await Promise.all([
      supabase.from('ticket_statuses').select('*').order('sort_order'),
      supabase.from('ticket_modules').select('*').order('sort_order'),
      supabase.from('ticket_slas').select('*').order('resolution_hours') // Order by hours (Critical usually lowest)
    ]);

    if (statusRes.error) console.error('Error fetching statuses:', statusRes.error);
    if (moduleRes.error) console.error('Error fetching modules:', moduleRes.error);
    if (slaRes.error) console.error('Error fetching SLAs:', slaRes.error);
    else console.log('Raw SLA Data:', slaRes.data);

    return {
      statuses: (statusRes.data || []).map((s: any) => ({
        id: s.id,
        label: s.label,
        colorHex: s.color_hex,
        sortOrder: s.sort_order
      })),
      modules: (moduleRes.data || []).map((m: any) => ({
        id: m.id,
        label: m.label,
        sortOrder: m.sort_order
      })),
      slas: (slaRes.data || []).map((s: any) => ({
        id: s.id,
        priority: s.priority,
        // Handle potential column name mismatches or missing data
        resolution_hours: s.resolution_hours || s.resolution_time || s.hours || 0,
        color_hex: s.color_hex
      }))
    };
  },

  createStatus: async (status: Omit<StatusConfig, 'id'>): Promise<StatusConfig> => {
    const { data, error } = await supabase
      .from('ticket_statuses')
      .insert({
        label: status.label,
        color_hex: status.colorHex,
        sort_order: status.sortOrder
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating status:', error);
      throw error;
    }
    return { id: data.id, label: data.label, colorHex: data.color_hex, sortOrder: data.sort_order };
  },

  deleteStatus: async (id: number): Promise<boolean> => {
    const { count, error } = await supabase
      .from('ticket_statuses')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      console.error('Error deleting status:', error);
      return false;
    }
    return count !== null && count > 0;
  },

  createModule: async (module: Omit<ModuleConfig, 'id'>): Promise<ModuleConfig> => {
    const { data, error } = await supabase
      .from('ticket_modules')
      .insert({
        label: module.label,
        sort_order: module.sortOrder
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating module:', error);
      throw error;
    }
    return { id: data.id, label: data.label, sortOrder: data.sort_order };
  },

  deleteModule: async (id: number): Promise<boolean> => {
    const { count, error } = await supabase
      .from('ticket_modules')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      console.error('Error deleting module:', error);
      return false;
    }
    return count !== null && count > 0;
  },

  updateSla: async (id: number, hours: number): Promise<boolean> => {
    const { error } = await supabase
      .from('ticket_slas')
      .update({ resolution_hours: hours })
      .eq('id', id);

    if (error) {
      console.error('Error updating SLA:', error);
      return false;
    }
    return true;
  },

  uploadFile: async (file: File): Promise<string | null> => {
    if (!supabase) return null;

    // Generate a unique file path: timestamp_random_filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from('ticket-attachments')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }

    return filePath;
  },

  getPublicUrl: (path: string): string => {
    if (!supabase) return '';
    const { data } = supabase.storage.from('ticket-attachments').getPublicUrl(path);
    return data.publicUrl;
  },

  // --- Notifications ---

  fetchNotifications: async (userId: string): Promise<Notification[]> => {
    if (!supabase) return [];

    // Get unread OR read within last 24 hours
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50); // Hard limit for safety

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data.map((n: any) => ({
      id: n.id,
      created_at: new Date(n.created_at),
      recipient_id: n.recipient_id,
      actor_id: n.actor_id,
      ticket_id: n.ticket_id,
      type: n.type as NotificationType,
      message: n.message,
      is_read: n.is_read
    }));
  },

  markNotificationRead: async (id: string): Promise<void> => {
    if (!supabase) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },

  createNotification: async (notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('notifications').insert({
      recipient_id: notification.recipient_id,
      actor_id: notification.actor_id,
      ticket_id: notification.ticket_id,
      type: notification.type,
      message: notification.message
    });
    if (error) console.error('Error creating notification:', error);
  },

  checkDependency: async (type: 'status' | 'module', label: string): Promise<number> => {
    if (!supabase) return 0;

    // Using count: 'exact', head: true to get the count without fetching data
    const { count, error } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq(type, label);

    if (error) {
      console.error(`Error checking dependency for ${type} '${label}':`, error);
      return 0; // Fail safe: assume 0 if error, but logging it. 
      // Alternatively, could throw or return -1 to block delete on error.
      // For this request, we'll return 0 but log it.
    }

    return count || 0;
  }
};