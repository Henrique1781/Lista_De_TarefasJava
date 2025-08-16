# Estágio 1: Build da Aplicação com Maven
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

COPY .mvn/ .mvn
COPY mvnw pom.xml ./

# LINHA ADICIONADA: Concede permissão de execução ao script mvnw
RUN chmod +x mvnw

# Executa o comando para baixar as dependências
RUN ./mvnw dependency:go-offline

COPY src ./src

# Executa o build, empacotando a aplicação em um arquivo .jar
RUN ./mvnw clean install -DskipTests


# Estágio 2: Imagem Final de Execução
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=build /app/target/gerenciador-tarefas-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]