import type { ApiParam } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ParamTableProps {
  params: ApiParam[];
}

export function ParamTable({ params }: ParamTableProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[160px]">Campo</TableHead>
            <TableHead className="w-[100px]">Tipo</TableHead>
            <TableHead className="w-[100px]">Obrigatório</TableHead>
            <TableHead>Descrição</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {params.map((param) => (
            <TableRow key={param.name}>
              <TableCell className="font-mono text-sm text-primary">
                {param.name}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {param.type}
              </TableCell>
              <TableCell>
                <Badge variant={param.required ? "default" : "secondary"} className="text-xs">
                  {param.required ? "Sim" : "Não"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                <span>{param.description}</span>
                {param.constraints && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {param.constraints}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
