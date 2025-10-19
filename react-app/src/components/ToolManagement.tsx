import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wrench, Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { ToolSet } from "@/types";

const INITIAL_TOOL_SETS: ToolSet[] = [
  {
    id: "1",
    name: "Облегченный набор инструмента для ЦОТО УФ RRJ/737/32S",
    tools: [
      "Отвертка «-»",
      "Отвертка «+»",
      "Отвертка на смещенный крест",
      "Коловорот",
      "Пассатижи контровочные",
      "Пассатижи",
      "Шэрница",
      "Разводной ключ",
      "Открывашка для банок с маслом",
      "Ключ рожковый/накидной ¾",
      "Бокорезы"
    ]
  }
];

export const ToolManagement = () => {
  const [toolSets, setToolSets] = useState<ToolSet[]>(INITIAL_TOOL_SETS);
  const [isOpen, setIsOpen] = useState(false);
  const [newToolSet, setNewToolSet] = useState({
    name: "",
    tools: [""]
  });

  const handleAddToolSet = () => {
    if (!newToolSet.name || newToolSet.tools.filter(t => t.trim()).length === 0) {
      toast.error("Заполните название набора и добавьте инструменты");
      return;
    }

    const toolSet: ToolSet = {
      id: Date.now().toString(),
      name: newToolSet.name,
      tools: newToolSet.tools.filter(t => t.trim())
    };

    setToolSets([...toolSets, toolSet]);
    setNewToolSet({ name: "", tools: [""] });
    setIsOpen(false);
    toast.success("Набор инструментов добавлен");
  };

  const handleDeleteToolSet = (id: string) => {
    setToolSets(toolSets.filter(ts => ts.id !== id));
    toast.success("Набор инструментов удален");
  };

  const addToolInput = () => {
    setNewToolSet({ ...newToolSet, tools: [...newToolSet.tools, ""] });
  };

  const updateTool = (index: number, value: string) => {
    const updatedTools = [...newToolSet.tools];
    updatedTools[index] = value;
    setNewToolSet({ ...newToolSet, tools: updatedTools });
  };

  const removeTool = (index: number) => {
    const updatedTools = newToolSet.tools.filter((_, i) => i !== index);
    setNewToolSet({ ...newToolSet, tools: updatedTools });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-card shadow-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-semibold">Управление наборами инструментов</h3>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Добавить набор
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Новый набор инструментов</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="setName">Название набора</Label>
                  <Input
                    id="setName"
                    value={newToolSet.name}
                    onChange={(e) => setNewToolSet({ ...newToolSet, name: e.target.value })}
                    placeholder="Название набора"
                  />
                </div>
                <div>
                  <Label>Инструменты</Label>
                  <div className="space-y-2 mt-2">
                    {newToolSet.tools.map((tool, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={tool}
                          onChange={(e) => updateTool(index, e.target.value)}
                          placeholder="Название инструмента"
                        />
                        {newToolSet.tools.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTool(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={addToolInput}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить инструмент
                  </Button>
                </div>
                <Button className="w-full" onClick={handleAddToolSet}>
                  Создать набор
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {toolSets.map((toolSet) => (
            <Card key={toolSet.id} className="p-4 bg-background">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">{toolSet.name}</h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteToolSet(toolSet.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {toolSet.tools.map((tool, index) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};
