export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Table = { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
export interface Database { chatten_cafe: { Tables: Record<string, Table>; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> }; }
