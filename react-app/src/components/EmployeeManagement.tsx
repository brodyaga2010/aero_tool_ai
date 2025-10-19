import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Employee } from "@/types";

const INITIAL_EMPLOYEES: Employee[] = [
  { id: "1", name: "Иванов Иван Петрович", position: "Авиатехник", department: "ТОиР" },
  { id: "2", name: "Петров Алексей Сергеевич", position: "Инженер", department: "ТОиР" },
  { id: "3", name: "Сидоров Владимир Михайлович", position: "Механик", department: "Комплектовка" },
];

export const EmployeeManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [isOpen, setIsOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    position: "",
    department: ""
  });

  const handleAddEmployee = () => {
    if (!newEmployee.name || !newEmployee.position || !newEmployee.department) {
      toast.error("Заполните все поля");
      return;
    }

    const employee: Employee = {
      id: Date.now().toString(),
      ...newEmployee
    };

    setEmployees([...employees, employee]);
    setNewEmployee({ name: "", position: "", department: "" });
    setIsOpen(false);
    toast.success("Сотрудник добавлен");
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(employees.filter(e => e.id !== id));
    toast.success("Сотрудник удален");
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-card shadow-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-semibold">Управление сотрудниками</h3>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Добавить сотрудника
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новый сотрудник</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">ФИО</Label>
                  <Input
                    id="name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    placeholder="Иванов Иван Петрович"
                  />
                </div>
                <div>
                  <Label htmlFor="position">Должность</Label>
                  <Input
                    id="position"
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                    placeholder="Авиатехник"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Подразделение</Label>
                  <Input
                    id="department"
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    placeholder="ТОиР"
                  />
                </div>
                <Button className="w-full" onClick={handleAddEmployee}>
                  Добавить
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="flex items-center justify-between p-4 rounded-lg bg-background border"
            >
              <div>
                <p className="font-medium">{employee.name}</p>
                <p className="text-sm text-muted-foreground">
                  {employee.position} • {employee.department}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteEmployee(employee.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
