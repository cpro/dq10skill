#! ruby -E utf-8:utf-8
# coding: utf-8

dir = File.dirname(__FILE__)

if ARGV.size < 1
  index_html_path = "#{dir}/../anlucea.html"
else
  index_html_path = ARGV[0].to_s
end

require 'rubygems'
require 'haml'
require 'json'

# スキル等データロード
data = JSON.parse(File.read("#{dir}/../dq10skill-anlucea-data.json"))
# HAMLからHTML生成
File.open(index_html_path, 'w') do |file|
  file.puts Haml::Engine.new(File.read("#{dir}/anlucea.haml")).render(Object.new, {:data => data})
end
