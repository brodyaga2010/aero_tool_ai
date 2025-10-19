import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Wrench, 
  Camera, 
  Shield, 
  Zap, 
  ArrowRight,
  CheckCircle2 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Camera,
      title: "Компьютерное зрение",
      description: "Автоматическое распознавание инструментов с точностью до 95%"
    },
    {
      icon: Zap,
      title: "Быстрая обработка",
      description: "Анализ изображения за секунды вместо минут ручного подсчета"
    },
    {
      icon: Shield,
      title: "Контроль безопасности",
      description: "Предотвращение авиационных происшествий через учет инструментов"
    },
    {
      icon: CheckCircle2,
      title: "Соответствие стандартам",
      description: "Полное соблюдение требований авиационных регуляторов"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-primary mx-auto">
            <Wrench className="h-10 w-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            ToolTrack
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Интеллектуальная система автоматизации учета инструментов 
            для авиационного технического обслуживания
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="text-lg h-14 px-8 gap-2"
              onClick={() => navigate("/dashboard")}
            >
              Начать работу
              <ArrowRight className="h-5 w-5" />
            </Button>
            {/* <Button 
              size="lg" 
              variant="outline"
              className="text-lg h-14 px-8"
            >
              Документация
            </Button> */}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Возможности системы
            </h2>
            <p className="text-lg text-muted-foreground">
              Современные технологии для повышения эффективности работы ИТП
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="p-6 bg-gradient-card shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-20">
        <Card className="max-w-4xl mx-auto p-12 bg-gradient-card shadow-lg">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">95%</div>
              <p className="text-muted-foreground">Точность распознавания</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10%</div>
              <p className="text-muted-foreground">Экономия рабочего времени</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">11</div>
              <p className="text-muted-foreground">Инструментов в базе</p>
            </div>
          </div>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Готовы повысить эффективность работы?
          </h2>
          <p className="text-lg text-muted-foreground">
            Начните использовать ToolTrack и сократите время на учет инструментов
          </p>
          <Button 
            size="lg" 
            className="text-lg h-14 px-8"
            onClick={() => navigate("/dashboard")}
          >
            Перейти к системе
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
