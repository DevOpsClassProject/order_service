@Library('my-shared-library') _

pipeline {
    agent {
        node {
            // If branch is develop, run on the dev-server agent. 
            // Otherwise (feature branches), use the docker-runner.
            label (env.CHANGE_BRANCH == 'develop' ? 'docker-v1' : 'docker-runner')
        }
    }

    environment {
        IMAGE_NAME    = "ecommerce-order"
        REGISTRY_USER = "tejung"
        DOCKER_CREDS  = 'docker-hub-token'

        // Database Secrets (Kept here for deployment context)
        DB_PASSWORD_VAL = credentials('db-password-secret')
        POSTGRES_DB     = 'ecommerce'
        POSTGRES_USER   = 'postgres'
        POSTGRES_PASSWORD  = "${DB_PASSWORD_VAL}"
        PGPORT            = '5432'
        DB_HOST           = 'ecommerce-db-container'
        DB_NAME           = 'ecommerce'
        DB_USER           = 'postgres'
        DB_PASSWORD       = "${DB_PASSWORD_VAL}"
        DB_PORT           = '5432'
    }

    stages {
        // STEP 1: Scan Source (package.json) for vulnerable dependencies
        stage('Security: Source Scan') {
            steps {
                trivyScan(severity: 'HIGH,CRITICAL')
            }
        }

        // STEP 2: Build (runs npm test internally) + Image Scan + Push
        stage('Build, Test & Delivery') {
            steps {
                dockerBuildPush(
                    registryUser: env.REGISTRY_USER,
                    imageName: env.IMAGE_NAME,
                    credsId: env.DOCKER_CREDS
                )
            }
        }
        stage('Prepare Environment') {
            steps {
                echo 'Cleaning up dangling Docker networks...'
                // -f (force) skips the confirmation prompt
                // || true ensures the pipeline continues even if prune returns a non-zero exit code
                sh 'docker network prune -f || true'
            }
        }
        stage('Run Integration Tests') {
            steps {
                script {
                    build job: '/DevOps project/ecommerce-integration-tests/main', wait: false
                }
            }
        }
        stage('Deploy') {
            steps {
                script {
                    if (env.CHANGE_BRANCH == 'develop' || env.BRANCH_NAME == 'develop'){
                        echo "Updating Database container in ${env.BRANCH_NAME}..."
                        sh "docker compose up -d ecommerce-order"
                    }else {
                        echo "Skipping container deployment."
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                // Only prune if we are NOT on a protected branch
                if ((env.BRANCH_NAME != null && env.BRANCH_NAME.contains('feature')) || env.BRANCH_NAME.contains('feature')) {
                    echo "Feature branch detected (${env.BRANCH_NAME}). Cleaning up Docker system..."
                    sh 'docker system prune -f'
                }else {
                echo "Skipping Docker prune (Branch is null or not a feature branch)."
            }
            }
            deleteDir()
        }
    }
}